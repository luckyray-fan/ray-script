// ==UserScript==
// @name         Image Hover Preview
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Show large image preview on hover
// @author       You
// @match        *://*/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function () {
  "use strict";

  // 添加自定义样式
  GM_addStyle(`
      .image-preview-container {
          position: fixed;
          display: none;
          z-index: 99999999999;
          pointer-events: none;
          box-shadow: 0 0 20px rgba(0,0,0,0.3);
          border-radius: 4px;
          background: white;
          overflow: hidden;
          transition: transform 0.2s ease-out;
          transform-origin: top left;
          border: 1px solid #ddd;
      }

      .preview-image {
          display: block;
          width: 100%;
          object-fit: contain;
      }

      .image-highlight {
          outline: 2px solid #3498db;
          transition: outline-color 0.3s;
      }
  `);

  // 创建预览容器
  const previewContainer = document.createElement("div");
  previewContainer.className = "image-preview-container";
  const previewImg = document.createElement("img");
  previewImg.className = "preview-image";
  previewContainer.appendChild(previewImg);
  document.body.appendChild(previewContainer);

  // 处理鼠标事件
  let hoverTimeout;
  let activeElement = null;
  const existImgs = {};
  document.addEventListener("mousemove", async function (event) {
    const targetImg = event.target.closest("img");
    // 大图就不放大看了
    if (!targetImg || this.location.href.includes("s=view")) return;

    // 如果是新图片元素
    if (activeElement !== targetImg) {
      clearTimeout(hoverTimeout);
      // 避免hover 会展示 title挡住图片
      targetImg.title = ''
      activeElement = targetImg;

      // 高亮当前图片
      targetImg.classList.add("image-highlight");

      // 设置延迟显示预览, setTimeout 是为了可以mouseout的时候清除, 避免反复进出图片导致的重复渲染 previewContainer
      hoverTimeout = setTimeout(async () => {
        await updatePreview(targetImg, event.clientX, event.clientY);
        previewContainer.style.display = "block";
      }, 4);
    }
  });
  document.addEventListener("mouseout", function (event) {
    clearTimeout(hoverTimeout);
    hidePreview();
  });

  // 更新预览位置和图像
  async function updatePreview(img, mouseX, mouseY) {
    // 获取最佳尺寸图片URL
    const imgUrl = existImgs[img.src] || (await getBestImageUrl(img));
    if (!imgUrl) return;

    // 设置图片URL（避免重复加载）
    if (previewImg.src !== imgUrl) {
      previewImg.src = imgUrl;
    }

    // 动态调整预览位置
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const width = 400;
    const previewWidth = Math.min(width, img.width * 4);
    const previewHeight = Math.min((width * img.height) / img.width, img.height * 4);
    // 计算合适的位置（右侧显示）
    let left = img.offsetLeft + img.width + 20;
    if (left + previewWidth > viewportWidth) {
      left = viewportWidth - previewWidth - 10;
    }

    // 垂直居中跟随
    let top = img.offsetTop - previewHeight / 2;
    if (top < 10) top = 10;
    if (top + previewHeight > viewportHeight - 10) {
      top = viewportHeight - previewHeight - 10;
    }

    // 应用样式
    previewContainer.style.width = `${previewWidth}px`;
    previewContainer.style.height = `${previewHeight}px`;
    previewContainer.style.left = `${left}px`;
    previewContainer.style.top = `${top}px`;
  }

  // 隐藏预览
  function hidePreview() {
    previewContainer.style.display = "none";
    if (activeElement) {
      activeElement.classList.remove("image-highlight");
      activeElement = null;
      previewImg.src = "";
    }
  }

  // 寻找最佳尺寸图片URL
  async function getBestImageUrl(imgElement) {
    // 尝试获取可能的大尺寸图片URL
    const temp =
      imgElement.dataset.src ||
      imgElement.dataset.original ||
      imgElement.src ||
      imgElement.currentSrc;
    const largeImg = temp.replace("thumbnails", "/samples").replace("thumbnail", "sample");
    const isExist = await checkImageExists(largeImg);
    let finalImg = largeImg;
    if (!isExist) {
      finalImg = temp.replace("thumbnails", "/images").replace("thumbnail_", "");
      const isExistJpg = await checkImageExists(finalImg);
      if(!isExistJpg){
        finalImg = finalImg.replace('jpg', 'png')
      }
    }
    existImgs[temp] = finalImg;
    return finalImg;
  }
})();
function checkImageExists(url) {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: "HEAD",
      url: url,
      onload: function (response) {
        resolve(response.status === 200);
      },
      onerror: function (error) {
        resolve(false);
      },
      ontimeout: function () {
        resolve(false);
      },
    });
  });
}
