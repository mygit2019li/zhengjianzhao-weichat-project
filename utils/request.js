const request = (options) => {
    // 每次请求时动态获取BASE_URL，确保app实例已经初始化
    const app = getApp();
    const BASE_URL = app.globalData.goapiUrl;
    
    console.log('请求URL:', BASE_URL + options.url);
    
    return new Promise((resolve, reject) => {
        wx.request({
            url: BASE_URL + options.url,
            method: options.method || 'GET',
            data: options.data,
            header: options.header || {
                'content-type': 'application/json'
            },
            success: (res) => {
                if (res.data.code === 0) {
                    resolve(res.data);
                } else {
                    wx.showToast({
                        title: res.data.msg || '请求失败',
                        icon: 'none'
                    });
                    reject(res.data);
                }
            },
            fail: (err) => {
                wx.showToast({
                    title: '网络错误',
                    icon: 'none'
                });
                reject(err);
            }
        });
    });
};

module.exports = {
    request,
    // 导出一个函数而不是常量，确保每次调用都能获取最新的BASE_URL
    get BASE_URL() {
        const app = getApp();
        return app.globalData.goapiUrl;
    }
};
