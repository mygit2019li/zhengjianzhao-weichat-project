/**
 * 隐私协议授权弹窗
 *
 * 依据《小程序隐私协议开发指南》官方 demo1 实现：
 *   wx.getPrivacySetting 查询同步状态 → 未同步则弹出自定义引导
 *   → <button open-type="agreePrivacyAuthorization"> 完成同步
 *
 * 设计说明：
 * - 不注册 wx.onNeedPrivacyAuthorization：留下"开发者未响应"的状态，
 *   任何页面调用隐私接口而用户尚未同意时，微信会自动兜底弹官方弹窗。
 * - 用户点「暂不同意」时只关闭弹窗、不向微信同步拒绝态，
 *   冷静期内不再主动打扰，之后由官方弹窗兜底承接。
 */

// 用户拒绝后的冷静期，与微信官方弹窗的 10s 防打扰规则对齐
const REJECT_KEY = 'privacy_reject_ts';
const REJECT_COOLDOWN = 10000;

Component({
  data: {
    visible: false,
    contractName: '《用户隐私保护指引》'
  },

  lifetimes: {
    attached() {
      // 页面可能已经 show 过，这里补一次检查（pageLifetimes.show 只覆盖后续显示）
      setTimeout(() => this.checkPrivacy(), 0);
    }
  },

  pageLifetimes: {
    show() {
      this.checkPrivacy();
    }
  },

  methods: {
    /**
     * 查询隐私授权同步状态，未同步则弹出引导
     */
    checkPrivacy() {
      // 基础库 < 2.32.3 未集成隐私功能，也不会拦截隐私接口调用
      if (typeof wx.getPrivacySetting !== 'function') return;
      // 已在展示中，避免重复触发
      if (this.data.visible) return;

      // 用户刚拒绝过：冷静期内不主动打扰
      let lastReject = 0;
      try {
        lastReject = wx.getStorageSync(REJECT_KEY) || 0;
      } catch (e) {
        lastReject = 0;
      }
      if (Date.now() - lastReject < REJECT_COOLDOWN) return;

      wx.getPrivacySetting({
        success: (res) => {
          if (res && res.needAuthorization) {
            this.setData({
              visible: true,
              contractName: res.privacyContractName || '《用户隐私保护指引》'
            });
          } else {
            this.setData({ visible: false });
          }
        },
        fail: () => {
          // 查询失败不阻塞使用，交由官方弹窗兜底
        }
      });
    },

    /**
     * 用户点击「同意」——由 agreePrivacyAuthorization 按钮触发，
     * 微信侧收到同步信息后即可调用已声明的隐私接口
     */
    onAgree() {
      this.setData({ visible: false });
    },

    /**
     * 用户点击「暂不同意」
     */
    onReject() {
      try {
        wx.setStorageSync(REJECT_KEY, Date.now());
      } catch (e) {
        // ignore
      }
      this.setData({ visible: false });
    },

    /**
     * 查看《用户隐私保护指引》全文
     */
    openContract() {
      if (typeof wx.openPrivacyContract !== 'function') return;
      wx.openPrivacyContract({
        success: () => {},
        fail: () => {
          wx.showToast({ title: '隐私协议打开失败', icon: 'none' });
        }
      });
    },

    // 阻止蒙层滚动穿透
    noop() {}
  }
});
