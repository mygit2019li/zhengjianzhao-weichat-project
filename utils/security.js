const CryptoJS = require('./crypto-js.js');

/**
 * 接口请求加密与签名工具类
 */
const Security = {
  // 生成签名
  generateSignature: function (data, appId, timestamp, secretKey) {
    const sortedKeys = Object.keys(data).sort();
    let baseString = sortedKeys.map(key => `${key}=${data[key]}`).join('&');
    baseString += `&app_id=${appId}&timestamp=${timestamp}&key=${secretKey}`;
    
    return CryptoJS.HmacSHA256(baseString, secretKey).toString(CryptoJS.enc.Hex);
  },

  // AES 加密
  encryptData: function (data, secretKey) {
    const jsonStr = JSON.stringify(data);
    const key = CryptoJS.enc.Utf8.parse(secretKey);
    const encrypted = CryptoJS.AES.encrypt(jsonStr, key, {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7
    });
    return encrypted.toString();
  },

  // 包装请求头
  getSecurityHeaders: function (data, appId, secretKey) {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = this.generateSignature(data, appId, timestamp, secretKey);
    
    return {
      'X-App-Id': appId,
      'X-Timestamp': timestamp.toString(),
      'X-Signature': signature
    };
  }
};

module.exports = Security;
