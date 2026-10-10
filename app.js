const Auth = require('./utils/auth.js');

App({
  onLaunch: function () {
    var t = this;
    wx.getSystemInfo({
      success: function (a) {
        t.globalData.StatusBar = a.statusBarHeight;
        var e = wx.getMenuButtonBoundingClientRect();
        e ? (t.globalData.Custom = e, t.globalData.CustomBar = e.bottom + e.top - a.statusBarHeight) : t.globalData.CustomBar = a.statusBarHeight + 50;
      }
    });

    // 静默登录：启动即预取 openid（供内容安全检测 msgSecCheck 使用）
    // 无感、不阻塞启动、失败静默 —— 后续调用 Auth.ensureOpenid() 时会自动重试
    setTimeout(function () {
      Auth.silentLogin();
    }, 0);
  },
  loadGlobalFonts: function (options = {}) {
    const { useLite = false } = options;
    const fontUrl = this.globalData.fontUrl;

    if (!wx.loadFontFace || !fontUrl) {
      return Promise.resolve(false);
    }

    // Check if we already loaded the requested version
    if (!useLite && this.globalData.fullFontsLoaded) {
      return Promise.resolve(true);
    }
    if (useLite && this.globalData.liteFontsLoaded) {
      return Promise.resolve(true);
    }

    const fonts = [
      { family: 'PlayfairDisplayRegular', file: 'playfairdisplayregular-ywloy.ttf' },
      { family: 'HYChengXingJian', file: useLite ? 'HYChengXingJian_01.ttf' : 'HYChengXingJian.ttf' },
      { family: 'HYZhongSongJian', file: useLite ? 'HYZhongSongJian_01.ttf' : 'HYZhongSongJian.ttf' },
      { family: 'huaguangmaotixingkai', file: useLite ? 'huaguangmaotixingkai_01.ttf' : 'huaguangmaotixingkai.ttf' }
    ];

    const baseUrl = fontUrl.endsWith('/') ? fontUrl : fontUrl + '/';

    const loadSingleFont = (font) => {
      return new Promise((resolve) => {
        wx.loadFontFace({
          family: font.family,
          source: `url("${baseUrl}${font.file}")`,
          scopes: ['webview', 'native'],
          global: true,
          success: () => {
            console.log(`Font loaded: ${font.family} (${useLite ? 'lite' : 'full'})`);
            resolve(true);
          },
          fail: (err) => {
            console.error(`Font load failed: ${font.family}`, err);
            resolve(false);
          }
        });
      });
    };

    return Promise.all(fonts.map(loadSingleFont)).then(() => {
      if (useLite) {
        this.globalData.liteFontsLoaded = true;
      } else {
        this.globalData.fullFontsLoaded = true;
      }
      return true;
    });
  },
  globalData: {
    userInfo: null,
    apiUrl: 'https://api.zjzxcx.top/py',
    goapiUrl: 'https://api.zjzxcx.top',
    fontUrl: 'https://api.zjzxcx.top/font/',
    liteFontsLoaded: false,
    fullFontsLoaded: false,
    // apiUrl: 'http://127.0.0.1:8087',
    // goapiUrl: 'http://127.0.0.1:8088',
    // fontUrl: 'https://api.zjzxcx.top/font/',
    appId: 'wx_123456789', // 模拟 APP_ID
    apiSecretKey: '1234567890abcdef1234567890abcdef', // 128-bit or 256-bit key
    ColorList: [{
      title: "嫣红",
      name: "red",
      color: "#e54d42"
    }, {
      title: "桔橙",
      name: "orange",
      color: "#f37b1d"
    }, {
      title: "明黄",
      name: "yellow",
      color: "#fbbd08"
    }, {
      title: "橄榄",
      name: "olive",
      color: "#8dc63f"
    }, {
      title: "森绿",
      name: "green",
      color: "#39b54a"
    }, {
      title: "天青",
      name: "cyan",
      color: "#1cbbb4"
    }, {
      title: "海蓝",
      name: "blue",
      color: "#0081ff"
    }, {
      title: "姹紫",
      name: "purple",
      color: "#6739b6"
    }, {
      title: "木槿",
      name: "mauve",
      color: "#9c26b0"
    }, {
      title: "桃粉",
      name: "pink",
      color: "#e03997"
    }, {
      title: "棕褐",
      name: "brown",
      color: "#a5673f"
    }, {
      title: "玄灰",
      name: "grey",
      color: "#8799a3"
    }, {
      title: "草灰",
      name: "gray",
      color: "#aaaaaa"
    }, {
      title: "墨黑",
      name: "black",
      color: "#333333"
    }, {
      title: "雅白",
      name: "white",
      color: "#ffffff"
    }]
  }
})
