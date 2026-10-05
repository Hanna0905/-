// 應用程式邏輯與使用者介面控制
document.addEventListener('DOMContentLoaded', () => {
  const renderer = new CalligraphyRenderer();

  // 狀態管理
  const state = {
    mode: 'calligraphy', // 'calligraphy' | 'grid'
    text: '月落烏啼霜滿天，江楓漁火對愁眠。姑蘇城外寒山寺，夜半鐘聲到客船。',
    fontFamily: '"DFKai-SB", "BiauKai", "KaiTi", "cwTeXKai", "Noto Serif TC", serif',
    fontSizeRatio: 86,
    offsetX: 0,
    offsetY: 0,
    charStyle: 'solid', // 'solid' | 'hollow' | 'tracing' | 'dotted'
    textColor: '#111111',
    hollowColor: '#222222',
    traceColor: 'rgba(0, 0, 0, 0.22)',
    ignorePunctuation: true,

    // 格線
    gridType: 'new_nine', // 'new_nine' | 'tian' | 'mi' | 'jing' | 'hui' | 'blank'
    newNineRatio: 'standard', // 'standard' (1:1:1) | 'golden' (3:4:3)
    newNineCross: false,
    gridColor: '#c82423',
    borderWidth: 2,
    innerLineWidth: 1,
    innerLineStyle: 'dashed', // 'dashed' | 'dotted' | 'solid'
    innerOpacity: 0.65,

    // 版面
    orientation: 'portrait', // 'portrait' | 'landscape'
    calCols: 2,
    calRows: 3,
    calDirection: 'rtl', // 'rtl' | 'ltr'
    showSidebar: true,

    gridCols: 6,
    gridRows: 10,
    direction: 'rtl', // 'rtl' | 'ltr' | 'horizontal'
    gridFillMode: 'flow', // 'flow' | 'sample_practice' | 'row_practice'
    repeatCount: 5,
    traceStyle: 'hollow',
    showHeader: true,
    headerTitle: '書法與國字作業簿',
    showPageNumber: true,

    // 邊距
    marginTop: 65,
    marginBottom: 65,
    marginLeft: 65,
    marginRight: 65,

    // 輸出與檢視
    exportDpi: 2, // 1: 螢幕, 2: 高清, 3: 300DPI超清印刷
    currentPage: 0,
    totalPages: 1,
    zoom: 1.0
  };

  // DOM 元素快取
  const previewCanvas = document.getElementById('previewCanvas');
  const previewCtx = previewCanvas.getContext('2d');
  const previewContainer = document.getElementById('previewContainer');
  const pageIndicator = document.getElementById('pageIndicator');
  const textInput = document.getElementById('textInput');
  const charCountDisplay = document.getElementById('charCountDisplay');
  const presetSelect = document.getElementById('presetSelect');

  // 初始化範本下拉選單
  function initPresets() {
    presetSelect.innerHTML = '<option value="">-- 請選擇經典範本 / 結構練習帖 --</option>';

    const grpStructure = document.createElement('optgroup');
    grpStructure.label = '【花蓮學習網·漢字結構教學組】';
    PRESETS.structures.forEach(item => {
      const opt = document.createElement('option');
      opt.value = 'struct_' + item.id;
      opt.textContent = item.title;
      grpStructure.appendChild(opt);
    });
    presetSelect.appendChild(grpStructure);

    const grpPoem = document.createElement('optgroup');
    grpPoem.label = '【經典詩詞精選】';
    PRESETS.poems.forEach(item => {
      const opt = document.createElement('option');
      opt.value = 'poem_' + item.id;
      opt.textContent = item.title;
      grpPoem.appendChild(opt);
    });
    presetSelect.appendChild(grpPoem);

    const grpClassic = document.createElement('optgroup');
    grpClassic.label = '【抄經·千字文·啟蒙長篇】';
    PRESETS.classics.forEach(item => {
      const opt = document.createElement('option');
      opt.value = 'classic_' + item.id;
      opt.textContent = item.title;
      grpClassic.appendChild(opt);
    });
    presetSelect.appendChild(grpClassic);
  }

  // 讀取 UI 設定並同步到 state
  function syncStateFromUI() {
    state.mode = document.querySelector('input[name="appMode"]:checked').value;
    state.text = textInput.value;
    state.ignorePunctuation = document.getElementById('ignorePunctuation').checked;

    // 字體樣式
    state.fontFamily = document.getElementById('fontFamily').value;
    state.fontSizeRatio = parseInt(document.getElementById('fontSizeRatio').value, 10);
    state.charStyle = document.getElementById('charStyle').value;
    state.textColor = document.getElementById('textColor').value;
    state.hollowColor = document.getElementById('hollowColor').value;
    state.traceColor = document.getElementById('traceColor').value;

    // 格線
    state.gridType = document.getElementById('gridType').value;
    state.newNineRatio = document.getElementById('newNineRatio').value;
    state.newNineCross = document.getElementById('newNineCross').checked;
    state.gridColor = document.getElementById('gridColor').value;
    state.borderWidth = parseFloat(document.getElementById('borderWidth').value);
    state.innerLineWidth = parseFloat(document.getElementById('innerLineWidth').value);
    state.innerLineStyle = document.getElementById('innerLineStyle').value;
    state.innerOpacity = parseFloat(document.getElementById('innerOpacity').value);

    // 版面
    state.orientation = document.getElementById('orientation').value;
    state.calCols = parseInt(document.getElementById('calCols').value, 10);
    state.calRows = parseInt(document.getElementById('calRows').value, 10);
    state.calDirection = document.getElementById('calDirection').value;
    state.showSidebar = document.getElementById('showSidebar').checked;

    state.gridCols = parseInt(document.getElementById('gridCols').value, 10);
    state.gridRows = parseInt(document.getElementById('gridRows').value, 10);
    state.direction = document.getElementById('direction').value;
    state.gridFillMode = document.getElementById('gridFillMode').value;
    state.repeatCount = parseInt(document.getElementById('repeatCount').value, 10);
    state.traceStyle = document.getElementById('traceStyle').value;
    state.showHeader = document.getElementById('showHeader').checked;
    state.headerTitle = document.getElementById('headerTitle').value;
    state.showPageNumber = document.getElementById('showPageNumber').checked;

    // 匯出解析度
    state.exportDpi = parseFloat(document.getElementById('exportDpi').value);

    // 更新字數顯示
    charCountDisplay.textContent = `字數：${Array.from(state.text).length} 字`;

    // 模式切換時顯示/隱藏對應面板
    const calSettings = document.getElementById('calSettingsPanel');
    const gridSettings = document.getElementById('gridSettingsPanel');
    if (state.mode === 'calligraphy') {
      calSettings.style.display = 'block';
      gridSettings.style.display = 'none';
    } else {
      calSettings.style.display = 'none';
      gridSettings.style.display = 'block';
    }

    // 新九宮格細項顯示控制
    const newNineOptions = document.getElementById('newNineOptions');
    if (state.gridType === 'new_nine') {
      newNineOptions.style.display = 'block';
    } else {
      newNineOptions.style.display = 'none';
    }

    // 生字簿練習模式細項
    const practiceSettings = document.getElementById('practiceSettings');
    if (state.gridFillMode !== 'flow') {
      practiceSettings.style.display = 'block';
    } else {
      practiceSettings.style.display = 'none';
    }
  }

  // 重新渲染預覽畫布
  function updatePreview() {
    syncStateFromUI();

    // 計算頁數
    const pages = CalligraphyRenderer.calculatePages(state);
    state.totalPages = Math.max(1, pages.length);
    if (state.currentPage >= state.totalPages) {
      state.currentPage = state.totalPages - 1;
    }
    if (state.currentPage < 0) {
      state.currentPage = 0;
    }

    pageIndicator.textContent = `${state.currentPage + 1} / ${state.totalPages}`;

    // 使用預覽比例繪製 (預覽使用 1.5x 或 2x 以達到視網膜平滑效果)
    const previewOptions = Object.assign({}, state, { dpiScale: 1.5 });
    const rendered = renderer.renderPage(previewOptions, state.currentPage);

    previewCanvas.width = rendered.width;
    previewCanvas.height = rendered.height;
    previewCtx.clearRect(0, 0, rendered.width, rendered.height);
    previewCtx.drawImage(rendered, 0, 0);

    applyZoom();
  }

  // 縮放控制
  function applyZoom() {
    previewCanvas.style.transform = `scale(${state.zoom})`;
    previewCanvas.style.transformOrigin = 'top center';
    document.getElementById('zoomLevelDisplay').textContent = `${Math.round(state.zoom * 100)}%`;
  }

  // 自適應畫面大小
  function fitToScreen() {
    const containerW = previewContainer.clientWidth - 40;
    const canvasW = previewCanvas.width;
    if (canvasW > 0 && containerW > 0) {
      state.zoom = Math.min(1.2, Math.max(0.35, containerW / canvasW));
      applyZoom();
    }
  }

  // ==========================================
  // 核心功能：匯出圖檔 (PNG / JPG / ZIP / 剪貼簿)
  // ==========================================

  // 匯出當前頁圖檔 (PNG 或 JPG)
  function exportCurrentImage(format = 'png') {
    syncStateFromUI();
    const exportOptions = Object.assign({}, state, { dpiScale: state.exportDpi });
    const canvas = renderer.renderPage(exportOptions, state.currentPage);

    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const ext = format === 'jpeg' ? 'jpg' : 'png';
    const quality = format === 'jpeg' ? 0.92 : undefined;

    canvas.toBlob(blob => {
      if (!blob) {
        showToast('產生圖檔失敗，請稍候重試', 'error');
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const pageStr = String(state.currentPage + 1).padStart(2, '0');
      const modeName = state.mode === 'calligraphy' ? '書法練習簿' : '九宮格作業簿';
      a.download = `${modeName}_第${pageStr}頁.${ext}`;
      a.href = url;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`已成功匯出第 ${state.currentPage + 1} 頁圖檔 (${ext.toUpperCase()})！`, 'success');
    }, mimeType, quality);
  }

  // 一鍵打包匯出全部頁面圖檔 (ZIP 或連續下載)
  async function exportAllPages() {
    syncStateFromUI();
    const pages = CalligraphyRenderer.calculatePages(state);
    const total = pages.length;

    const exportOptions = Object.assign({}, state, { dpiScale: state.exportDpi });
    const modeName = state.mode === 'calligraphy' ? '書法練習簿' : '九宮格作業簿';

    showToast(`正在產生全部 ${total} 頁高解析度圖檔，請稍候...`, 'info', 5000);

    // 檢查是否有 JSZip 支援
    if (typeof JSZip !== 'undefined') {
      try {
        const zip = new JSZip();
        for (let i = 0; i < total; i++) {
          const canvas = renderer.renderPage(exportOptions, i);
          const dataUrl = canvas.toDataURL('image/png');
          const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
          const pageStr = String(i + 1).padStart(2, '0');
          zip.file(`${modeName}_第${pageStr}頁.png`, base64Data, { base64: true });
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.download = `${modeName}_全套${total}頁.zip`;
        a.href = url;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast(`已成功下載 ZIP 壓縮檔（共 ${total} 頁圖檔）！`, 'success');
        return;
      } catch (err) {
        console.warn('JSZip export failed, falling back to sequential downloads:', err);
      }
    }

    // 備用方案：逐頁連續下載
    for (let i = 0; i < total; i++) {
      await new Promise(resolve => {
        setTimeout(() => {
          const canvas = renderer.renderPage(exportOptions, i);
          canvas.toBlob(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const pageStr = String(i + 1).padStart(2, '0');
            a.download = `${modeName}_第${pageStr}頁.png`;
            a.href = url;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            resolve();
          }, 'image/png');
        }, i * 350);
      });
    }
    showToast(`全部 ${total} 頁圖檔已陸續下載完成！`, 'success');
  }

  // 複製當前頁圖檔到剪貼簿 (可在 Word / LINE / 簡報直接貼上)
  async function copyToClipboard() {
    syncStateFromUI();
    const exportOptions = Object.assign({}, state, { dpiScale: state.exportDpi });
    const canvas = renderer.renderPage(exportOptions, state.currentPage);

    try {
      canvas.toBlob(async blob => {
        if (!blob) {
          showToast('無法建立影像剪貼簿資料', 'error');
          return;
        }
        if (navigator.clipboard && navigator.clipboard.write) {
          const item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          showToast('已複製第 ' + (state.currentPage + 1) + ' 頁圖檔至剪貼簿！可直接按 Ctrl+V 貼上。', 'success');
        } else {
          showToast('您的瀏覽器不支援直接寫入圖片到剪貼簿，請使用「匯出圖檔」下載。', 'warning');
        }
      }, 'image/png');
    } catch (err) {
      console.error(err);
      showToast('複製失敗，請使用「匯出圖檔」下載。', 'error');
    }
  }

  // 列印 / 另存為 PDF
  function printPages() {
    syncStateFromUI();
    const pages = CalligraphyRenderer.calculatePages(state);
    const exportOptions = Object.assign({}, state, { dpiScale: 2 });

    // 建立臨時列印容器
    let printContainer = document.getElementById('printContainer');
    if (!printContainer) {
      printContainer = document.createElement('div');
      printContainer.id = 'printContainer';
      document.body.appendChild(printContainer);
    }
    printContainer.innerHTML = '';

    // 生成每一頁的 high-res 圖片放進列印容器
    pages.forEach((_, idx) => {
      const canvas = renderer.renderPage(exportOptions, idx);
      const img = document.createElement('img');
      img.src = canvas.toDataURL('image/png');
      img.className = 'print-page';
      printContainer.appendChild(img);
    });

    window.print();
  }

  // 提示訊息視窗 (Toast)
  function showToast(message, type = 'info', duration = 3000) {
    let toast = document.getElementById('appToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'appToast';
      document.body.appendChild(toast);
    }
    toast.className = `toast ${type} show`;
    toast.textContent = message;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.className = 'toast';
    }, duration);
  }

  // 自訂字型上傳支援
  document.getElementById('fontUploadInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fontName = 'CustomFont_' + Date.now();
    try {
      const buffer = await file.arrayBuffer();
      const fontFace = new FontFace(fontName, buffer);
      await fontFace.load();
      document.fonts.add(fontFace);

      // 加入字體選單
      const opt = document.createElement('option');
      opt.value = `"${fontName}", serif`;
      opt.textContent = `★ 上傳字型: ${file.name.replace(/\.[^/.]+$/, '')}`;
      document.getElementById('fontFamily').appendChild(opt);
      document.getElementById('fontFamily').value = opt.value;

      showToast(`已成功載入字型「${file.name}」！`, 'success');
      updatePreview();
    } catch (err) {
      console.error(err);
      showToast('載入字型失敗，請確保為標準 TTF/OTF/WOFF 字型檔。', 'error');
    }
  });

  // ==========================================
  // 事件監聽與綁定
  // ==========================================

  // 範本切換
  presetSelect.addEventListener('change', () => {
    const val = presetSelect.value;
    if (!val) return;

    let selected = null;
    if (val.startsWith('struct_')) {
      const id = val.replace('struct_', '');
      selected = PRESETS.structures.find(s => s.id === id);
    } else if (val.startsWith('poem_')) {
      const id = val.replace('poem_', '');
      selected = PRESETS.poems.find(p => p.id === id);
    } else if (val.startsWith('classic_')) {
      const id = val.replace('classic_', '');
      selected = PRESETS.classics.find(c => c.id === id);
    }

    if (selected) {
      textInput.value = selected.text;
      state.currentPage = 0;
      updatePreview();
      showToast(`已載入範本：「${selected.title}」`, 'info');
    }
  });

  // 輸入框即時更新 (Debounce)
  let inputTimer = null;
  textInput.addEventListener('input', () => {
    clearTimeout(inputTimer);
    inputTimer = setTimeout(() => {
      state.currentPage = 0;
      updatePreview();
    }, 200);
  });

  // 模式切換按鈕
  document.querySelectorAll('input[name="appMode"]').forEach(radio => {
    radio.addEventListener('change', () => {
      state.currentPage = 0;
      updatePreview();
    });
  });

  // 控制項監聽 (所有 input, select 變動時自動重繪)
  const formControls = document.querySelectorAll('.control-input');
  formControls.forEach(ctrl => {
    ctrl.addEventListener('input', () => updatePreview());
    ctrl.addEventListener('change', () => updatePreview());
  });

  // 常用顏色按鈕點選
  document.querySelectorAll('.color-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      const targetInput = document.getElementById(chip.dataset.target);
      if (targetInput) {
        targetInput.value = chip.dataset.color;
        updatePreview();
      }
    });
  });

  // 快速排版預設按鈕 (書法簿)
  document.querySelectorAll('.cal-layout-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('calCols').value = btn.dataset.cols;
      document.getElementById('calRows').value = btn.dataset.rows;
      updatePreview();
    });
  });

  // 快速排版預設按鈕 (格子簿)
  document.querySelectorAll('.grid-layout-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('gridCols').value = btn.dataset.cols;
      document.getElementById('gridRows').value = btn.dataset.rows;
      updatePreview();
    });
  });

  // 翻頁控制
  document.getElementById('prevPageBtn').addEventListener('click', () => {
    if (state.currentPage > 0) {
      state.currentPage--;
      updatePreview();
    }
  });
  document.getElementById('nextPageBtn').addEventListener('click', () => {
    if (state.currentPage < state.totalPages - 1) {
      state.currentPage++;
      updatePreview();
    }
  });
  document.getElementById('firstPageBtn').addEventListener('click', () => {
    state.currentPage = 0;
    updatePreview();
  });
  document.getElementById('lastPageBtn').addEventListener('click', () => {
    state.currentPage = state.totalPages - 1;
    updatePreview();
  });

  // 縮放控制
  document.getElementById('zoomInBtn').addEventListener('click', () => {
    state.zoom = Math.min(2.0, state.zoom + 0.1);
    applyZoom();
  });
  document.getElementById('zoomOutBtn').addEventListener('click', () => {
    state.zoom = Math.max(0.4, state.zoom - 0.1);
    applyZoom();
  });
  document.getElementById('zoomResetBtn').addEventListener('click', () => {
    state.zoom = 1.0;
    applyZoom();
  });
  document.getElementById('fitScreenBtn').addEventListener('click', () => {
    fitToScreen();
  });

  // 匯出按鈕點擊事件
  document.getElementById('exportPngBtn').addEventListener('click', () => exportCurrentImage('png'));
  document.getElementById('exportJpgBtn').addEventListener('click', () => exportCurrentImage('jpeg'));
  document.getElementById('exportZipBtn').addEventListener('click', () => exportAllPages());
  document.getElementById('copyImageBtn').addEventListener('click', () => copyToClipboard());
  document.getElementById('printPdfBtn').addEventListener('click', () => printPages());

  // 清空文字
  document.getElementById('clearTextBtn').addEventListener('click', () => {
    textInput.value = '';
    state.currentPage = 0;
    updatePreview();
  });

  // 初始化
  initPresets();
  updatePreview();
  setTimeout(fitToScreen, 150);

  // 視窗大小改變時自適應
  window.addEventListener('resize', () => {
    // 保持畫面可讀
  });
});
