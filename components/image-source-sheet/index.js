/**
 * 统一图片来源选择弹窗组件
 *
 * 各功能页的图片上传入口统一走这里：底部上滑面板选择「相册 / 聊天记录 / 拍照」，
 * 组件内部完成选图、大小校验、鉴黄检测、隐私授权错误处理，
 * 页面只需监听 chosen 事件拿校验过的 tempFilePaths。
 *
 * 用法：
 *   <image-source-sheet show="{{showSheet}}" count="{{9}}" sources="{{['album','chat','camera']}}"
 *                       bind:chosen="onImageChosen" bind:close="onSheetClose" />
 */
const { checkImageSize } = require('../../utils/util.js');
const NSFW = require('../../utils/nsfw.js');
const Privacy = require('../../utils/privacy.js');

// 各来源的展示配置（图标/渐变主题与首页原 action-sheet 保持一致）
const SOURCE_META = {
  album: { key: 'album', label: '从相册选择', theme: 'album', icon: '/images/icon/add-image.svg' },
  chat: { key: 'chat', label: '聊天记录', theme: 'chat', icon: '/images/icon/wechat-line.svg' },
  camera: { key: 'camera', label: '拍照', theme: 'camera', icon: '/images/icon/拍照.svg' }
};

Component({
  properties: {
    // 是否显示弹窗（页面控制，关闭由组件派发 close 事件同步）
    show: {
      type: Boolean,
      value: false
    },
    // 最多可选张数
    count: {
      type: Number,
      value: 1
    },
    // 来源渠道：['album', 'chat', 'camera'] 按需组合
    sources: {
      type: Array,
      value: ['album', 'camera']
    },
    // 透传给 wx.chooseImage 的 sizeType（贴图类需保留透明通道时传 ['original']）
    sizeType: {
      type: Array,
      value: ['original', 'compressed']
    },
    // 单张大小上限（MB），0 表示不校验。压缩/长图等专吃大图的入口传 0
    maxSizeMB: {
      type: Number,
      value: 15
    },
    title: {
      type: String,
      value: '请选择图片来源'
    },
    subtitle: {
      type: String,
      value: '支持从多个渠道选择图片'
    }
  },

  data: {
    sourceItems: [],
    busy: false // 选图/检测期间防连点
  },

  observers: {
    'sources': function (sources) {
      const items = (sources || [])
        .map(key => SOURCE_META[key])
        .filter(Boolean);
      this.setData({ sourceItems: items });
    }
  },

  lifetimes: {
    // 兜底：调用方未显式传 sources（走默认值）时 observers 不触发，这里补渲染一次
    attached: function () {
      if (!this.data.sourceItems.length) {
        const items = (this.properties.sources || [])
          .map(key => SOURCE_META[key])
          .filter(Boolean);
        this.setData({ sourceItems: items });
      }
    }
  },

  methods: {
    onClose() {
      if (this.data.busy) return;
      this.triggerEvent('close');
    },

    onTapSource(e) {
      if (this.data.busy) return;
      const source = e.currentTarget.dataset.source;
      if (source === 'chat') {
        this.chooseFromChat();
      } else {
        this.chooseFromImagePicker(source);
      }
    },

    // 相册 / 拍照：走 wx.chooseImage，统一做大小校验 + 鉴黄
    chooseFromImagePicker(sourceType) {
      this.setData({ busy: true });
      wx.chooseImage({
        count: this.properties.count,
        sizeType: this.properties.sizeType,
        sourceType: [sourceType],
        success: async (res) => {
          const paths = res.tempFilePaths || [];
          if (this.properties.maxSizeMB > 0 && !checkImageSize(res.tempFiles, this.properties.maxSizeMB)) {
            // 大小超限：保留弹窗，便于换图重试
            this.finish();
            return;
          }
          const isSafe = await NSFW.checkImagesAndAlert(paths);
          if (isSafe && paths.length) {
            this.triggerEvent('chosen', { paths, source: sourceType });
            this.finish(true);
          } else {
            // 鉴黄不通过：与大小超限保持一致，保留弹窗重试
            this.finish();
          }
        },
        fail: (err) => {
          Privacy.handlePrivacyError(err);
          this.finish();
        }
      });
    },

    // 聊天记录：chooseMessageFile 仅支持真实环境，做同样的校验兜底
    chooseFromChat() {
      if (!wx.chooseMessageFile) {
        wx.showToast({ title: '当前微信版本不支持聊天选图', icon: 'none' });
        return;
      }
      this.setData({ busy: true });
      wx.chooseMessageFile({
        count: this.properties.count,
        type: 'image',
        success: async (res) => {
          const files = res.tempFiles || [];
          const paths = files.map(file => file.path).filter(Boolean);
          if (!paths.length) {
            wx.showToast({ title: '未选择图片', icon: 'none' });
            this.finish();
            return;
          }
          if (this.properties.maxSizeMB > 0 && !checkImageSize(files, this.properties.maxSizeMB)) {
            this.finish();
            return;
          }
          const isSafe = await NSFW.checkImagesAndAlert(paths);
          if (isSafe) {
            this.triggerEvent('chosen', { paths, source: 'chat' });
            this.finish(true);
          } else {
            this.finish();
          }
        },
        fail: (err) => {
          if (Privacy.handlePrivacyError(err)) {
            this.finish();
            return;
          }
          // 用户主动取消不提示
          if (!(err && err.errMsg && err.errMsg.includes('cancel'))) {
            wx.showToast({ title: '聊天图片选择失败', icon: 'none' });
          }
          this.finish();
        }
      });
    },

    // 一次选图流程结束：成功路径关闭弹窗，失败/取消保留弹窗便于重试
    finish(shouldClose = false) {
      this.setData({ busy: false });
      if (shouldClose) {
        this.triggerEvent('close');
      }
    }
  }
});
