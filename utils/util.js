/**
 * Check if the selected images exceed the size limit.
 * @param {Array} tempFiles - Array of file objects from wx.chooseImage or wx.chooseMedia
 * @param {number} maxSizeMB - Maximum allowed size in MB (default 20)
 * @returns {boolean} - Returns true if all files are within the limit, false otherwise
 */
const checkImageSize = (tempFiles, maxSizeMB = 15) => {
    if (!tempFiles || tempFiles.length === 0) return true;

    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    for (let file of tempFiles) {
        if (file.size > maxSizeBytes) {
            wx.showToast({
                title: `图片大小不能超过${maxSizeMB}MB`,
                icon: 'none'
            });
            return false;
        }
    }
    return true;
};

module.exports = {
    checkImageSize
};
