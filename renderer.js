// 核心繪圖與排版引擎 (HTML5 Canvas 向量級渲染)
class CalligraphyRenderer {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
  }

  // 繪製單頁並回傳 Canvas
  renderPage(options, pageIndex = 0) {
    const scale = options.dpiScale || 2; // 2x: ~2100x2970, 3x: ~3150x4455
    const isLandscape = options.orientation === 'landscape';

    // A4 基礎尺寸 (點陣比例 1050 x 1485 @ 1x)
    const baseW = isLandscape ? 1485 : 1050;
    const baseH = isLandscape ? 1050 : 1485;

    const width = Math.round(baseW * scale);
    const height = Math.round(baseH * scale);

    this.canvas.width = width;
    this.canvas.height = height;
    const ctx = this.ctx;

    // 清空背景為純白 (匯出圖檔時不透底)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.scale(scale, scale);

    // 依據模式繪製
    if (options.mode === 'calligraphy') {
      this.drawCalligraphyPage(ctx, baseW, baseH, options, pageIndex);
    } else {
      this.drawGridBookPage(ctx, baseW, baseH, options, pageIndex);
    }

    ctx.restore();
    return this.canvas;
  }

  // 計算分頁資料 (回傳總頁數及每頁要放置的格子資料)
  static calculatePages(options) {
    const rawChars = Array.from(options.text || '');
    // 依據模式過濾或處理
    const chars = [];
    for (const ch of rawChars) {
      if (ch === '\n') continue;
      if (options.ignorePunctuation && PUNCTUATION_SET.has(ch)) continue;
      chars.push(ch);
    }

    if (options.mode === 'calligraphy') {
      // 書法大字簿：每頁格數 = cols * rows
      const cols = Math.max(1, parseInt(options.calCols) || 2);
      const rows = Math.max(1, parseInt(options.calRows) || 3);
      const cellsPerPage = cols * rows;

      if (chars.length === 0) {
        return [{ cells: Array(cellsPerPage).fill(null), sentence: '', pageNum: 1 }];
      }

      const pages = [];
      const totalPages = Math.ceil(chars.length / cellsPerPage) || 1;

      for (let p = 0; p < totalPages; p++) {
        const pageChars = chars.slice(p * cellsPerPage, (p + 1) * cellsPerPage);
        const sentence = pageChars.join('');
        const cells = [];

        for (let i = 0; i < cellsPerPage; i++) {
          cells.push(pageChars[i] || null);
        }

        pages.push({
          cells,
          sentence,
          pageNum: p + 1
        });
      }
      return pages;
    } else {
      // 格子作業簿 (生字簿)
      const cols = Math.max(2, parseInt(options.gridCols) || 6);
      const rows = Math.max(2, parseInt(options.gridRows) || 10);
      const cellsPerPage = cols * rows;

      const layoutType = options.gridFillMode || 'flow'; // 'flow' | 'sample_practice' | 'row_practice'
      const repeatCount = Math.max(1, parseInt(options.repeatCount) || 5); // 每個字練習格數

      let sequence = [];

      if (layoutType === 'flow') {
        // 連續排入
        sequence = chars.map((ch, idx) => ({ char: ch, type: options.charStyle }));
      } else if (layoutType === 'sample_practice') {
        // 首字示範 (實心)，第二字描紅/空心，其餘空格
        for (const ch of chars) {
          sequence.push({ char: ch, type: 'solid' }); // 示範字
          if (repeatCount > 1) {
            sequence.push({ char: ch, type: options.traceStyle || 'hollow' }); // 描字
          }
          for (let r = 2; r < repeatCount; r++) {
            sequence.push({ char: null, type: 'blank' }); // 空白格
          }
        }
      } else if (layoutType === 'row_practice') {
        // 每字一行（直行或橫行）
        // 依據方向，每一列/欄由一個生字引領
        const lineLen = options.direction === 'horizontal' ? cols : rows;
        for (const ch of chars) {
          sequence.push({ char: ch, type: 'solid' });
          if (lineLen > 1) {
            sequence.push({ char: ch, type: options.traceStyle || 'hollow' });
          }
          for (let k = 2; k < lineLen; k++) {
            sequence.push({ char: null, type: 'blank' });
          }
        }
      }

      if (sequence.length === 0) {
        return [{ cells: Array(cellsPerPage).fill(null), pageNum: 1 }];
      }

      const pages = [];
      const totalPages = Math.ceil(sequence.length / cellsPerPage) || 1;

      for (let p = 0; p < totalPages; p++) {
        const pageItems = sequence.slice(p * cellsPerPage, (p + 1) * cellsPerPage);
        const cells = [];
        for (let i = 0; i < cellsPerPage; i++) {
          cells.push(pageItems[i] || null);
        }
        pages.push({ cells, pageNum: p + 1 });
      }
      return pages;
    }
  }

  // ==========================================
  // 模式一：繪製書法練習簿 (大字條幅)
  // ==========================================
  drawCalligraphyPage(ctx, w, h, options, pageIndex) {
    const pages = CalligraphyRenderer.calculatePages(options);
    const pageData = pages[pageIndex] || { cells: [], sentence: '', pageNum: pageIndex + 1 };

    const cols = Math.max(1, parseInt(options.calCols) || 2);
    const rows = Math.max(1, parseInt(options.calRows) || 3);

    // 版面邊界計算
    const hasSidebar = options.showSidebar !== false;
    const sidebarWidth = hasSidebar ? 80 : 0;

    const marginTop = options.marginTop || 70;
    const marginBottom = options.marginBottom || 70;
    const marginLeft = (options.marginLeft || 70) + sidebarWidth;
    const marginRight = options.marginRight || 70;

    const availW = w - marginLeft - marginRight;
    const availH = h - marginTop - marginBottom;

    // 計算正方形格子尺寸 (保持正方)
    const cellW = availW / cols;
    const cellH = availH / rows;
    const cellSize = Math.min(cellW, cellH);

    const totalGridW = cellSize * cols;
    const totalGridH = cellSize * rows;

    // 居中偏移
    const startX = marginLeft + (availW - totalGridW) / 2;
    const startY = marginTop + (availH - totalGridH) / 2;

    // 繪製格子
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        // 傳統書法由右向左直排
        let cellIndex;
        if (options.calDirection === 'ltr') {
          cellIndex = c * rows + r;
        } else {
          // 由右向左 (預設)
          const colFromRight = (cols - 1 - c);
          cellIndex = colFromRight * rows + r;
        }

        const cx = startX + c * cellSize;
        const cy = startY + r * cellSize;
        const char = pageData.cells[cellIndex];

        // 畫單個格線
        this.drawSingleCellGrid(ctx, cx, cy, cellSize, options);

        // 畫文字
        if (char) {
          const charType = options.charStyle || 'solid';
          this.drawCharacter(ctx, char, cx, cy, cellSize, options, charType);
        }
      }
    }

    // 繪製外大框 (加粗)
    ctx.save();
    ctx.strokeStyle = options.gridColor || '#c82423';
    ctx.lineWidth = (options.borderWidth || 2) * 1.5;
    ctx.strokeRect(startX, startY, totalGridW, totalGridH);
    ctx.restore();

    // 繪製側邊導引欄 (文字 + 注音 + 頁碼，如同 1296x.webp)
    if (hasSidebar) {
      const sbX = (options.marginLeft || 70) + 15;
      const sbY = startY + totalGridH - 20;
      this.drawSidebarAnnotation(ctx, sbX, sbY, pageData.sentence, pageData.pageNum, options);
    }
  }

  // ==========================================
  // 模式二：繪製生字作業簿 (格子簿)
  // ==========================================
  drawGridBookPage(ctx, w, h, options, pageIndex) {
    const pages = CalligraphyRenderer.calculatePages(options);
    const pageData = pages[pageIndex] || { cells: [], pageNum: pageIndex + 1 };

    const cols = Math.max(2, parseInt(options.gridCols) || 6);
    const rows = Math.max(2, parseInt(options.gridRows) || 10);

    const hasHeader = options.showHeader !== false;
    const headerHeight = hasHeader ? 60 : 0;

    const marginTop = (options.marginTop || 50) + headerHeight;
    const marginBottom = options.marginBottom || 50;
    const marginLeft = options.marginLeft || 50;
    const marginRight = options.marginRight || 50;

    const availW = w - marginLeft - marginRight;
    const availH = h - marginTop - marginBottom;

    // 計算格子尺寸
    const cellW = availW / cols;
    const cellH = availH / rows;
    const cellSize = Math.min(cellW, cellH);

    const totalGridW = cellSize * cols;
    const totalGridH = cellSize * rows;

    const startX = marginLeft + (availW - totalGridW) / 2;
    const startY = marginTop + (availH - totalGridH) / 2;

    // 繪製作業簿頁首
    if (hasHeader) {
      this.drawHeaderInfo(ctx, startX, startY - headerHeight - 10, totalGridW, headerHeight, options);
    }

    // 遍歷格子
    const direction = options.direction || 'rtl'; // 'rtl' (直行由右向左), 'ltr' (直行由左向右), 'horizontal' (橫排)

    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        let cellIndex;
        if (direction === 'horizontal') {
          cellIndex = r * cols + c;
        } else if (direction === 'ltr') {
          cellIndex = c * rows + r;
        } else {
          // rtl 直排由右向左
          const colFromRight = (cols - 1 - c);
          cellIndex = colFromRight * rows + r;
        }

        const cx = startX + c * cellSize;
        const cy = startY + r * cellSize;
        const cellData = pageData.cells[cellIndex];

        // 畫格線
        this.drawSingleCellGrid(ctx, cx, cy, cellSize, options);

        // 畫文字
        if (cellData && cellData.char) {
          const char = typeof cellData === 'string' ? cellData : cellData.char;
          const charType = (cellData && cellData.type) ? cellData.type : options.charStyle;
          this.drawCharacter(ctx, char, cx, cy, cellSize, options, charType);
        }
      }
    }

    // 外大框
    ctx.save();
    ctx.strokeStyle = options.gridColor || '#c82423';
    ctx.lineWidth = (options.borderWidth || 2) * 1.5;
    ctx.strokeRect(startX, startY, totalGridW, totalGridH);
    ctx.restore();

    // 底部頁碼
    if (options.showPageNumber !== false) {
      ctx.save();
      ctx.fillStyle = '#666666';
      ctx.font = '16px "Noto Serif TC", "DFKai-SB", "KaiTi", serif';
      ctx.textAlign = 'center';
      ctx.fillText(`第 ${toChineseNumber(pageData.pageNum)} 頁`, w / 2, h - 25);
      ctx.restore();
    }
  }

  // 繪製單個格子的輔助線
  drawSingleCellGrid(ctx, x, y, size, options) {
    const gridType = options.gridType || 'new_nine';
    const color = options.gridColor || '#c82423';
    const borderWidth = options.borderWidth || 1.8;
    const innerLineWidth = options.innerLineWidth || 1;
    const lineStyle = options.innerLineStyle || 'dashed'; // 'solid' | 'dashed' | 'dotted'
    const opacity = options.innerOpacity !== undefined ? options.innerOpacity : 0.65;

    ctx.save();

    // 外邊框
    ctx.strokeStyle = color;
    ctx.lineWidth = borderWidth;
    ctx.strokeRect(x, y, size, size);

    // 內輔助線
    if (gridType !== 'blank') {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.globalAlpha = opacity;
      ctx.lineWidth = innerLineWidth;

      if (lineStyle === 'dashed') {
        ctx.setLineDash([Math.max(3, size * 0.04), Math.max(2, size * 0.03)]);
      } else if (lineStyle === 'dotted') {
        ctx.setLineDash([Math.max(1.5, size * 0.015), Math.max(3, size * 0.03)]);
      } else {
        ctx.setLineDash([]);
      }

      if (gridType === 'new_nine') {
        // 新九宮格 (可選 1:1:1 或 3:4:3 林岳瑩專利中心緊密比例)
        const ratioMode = options.newNineRatio || 'standard'; // 'standard' (1:1:1) | 'golden' (3:4:3)
        let p1, p2;
        if (ratioMode === 'golden') {
          p1 = size * 0.3;
          p2 = size * 0.7;
        } else {
          p1 = size / 3;
          p2 = (size / 3) * 2;
        }

        ctx.beginPath();
        // 垂直線
        ctx.moveTo(x + p1, y);
        ctx.lineTo(x + p1, y + size);
        ctx.moveTo(x + p2, y);
        ctx.lineTo(x + p2, y + size);
        // 水平線
        ctx.moveTo(x, y + p1);
        ctx.lineTo(x + size, y + p1);
        ctx.moveTo(x, y + p2);
        ctx.lineTo(x + size, y + p2);
        ctx.stroke();

        // 選擇性疊加中心十字線 (新九宮格專有)
        if (options.newNineCross) {
          ctx.save();
          ctx.globalAlpha = opacity * 0.75;
          ctx.beginPath();
          ctx.moveTo(x + size / 2, y + p1);
          ctx.lineTo(x + size / 2, y + p2);
          ctx.moveTo(x + p1, y + size / 2);
          ctx.lineTo(x + p2, y + size / 2);
          ctx.stroke();
          ctx.restore();
        }

      } else if (gridType === 'tian') {
        // 田字格 (十字中央線)
        const mid = size / 2;
        ctx.beginPath();
        ctx.moveTo(x + mid, y);
        ctx.lineTo(x + mid, y + size);
        ctx.moveTo(x, y + mid);
        ctx.lineTo(x + size, y + mid);
        ctx.stroke();

      } else if (gridType === 'mi') {
        // 米字格 (田字十字 + 對角線)
        const mid = size / 2;
        ctx.beginPath();
        // 十字
        ctx.moveTo(x + mid, y);
        ctx.lineTo(x + mid, y + size);
        ctx.moveTo(x, y + mid);
        ctx.lineTo(x + size, y + mid);
        // 對角線
        ctx.moveTo(x, y);
        ctx.lineTo(x + size, y + size);
        ctx.moveTo(x + size, y);
        ctx.lineTo(x, y + size);
        ctx.stroke();

      } else if (gridType === 'jing') {
        // 井字格 (等分 3x3 實體井字)
        const d = size / 3;
        ctx.beginPath();
        ctx.moveTo(x + d, y);
        ctx.lineTo(x + d, y + size);
        ctx.moveTo(x + d * 2, y);
        ctx.lineTo(x + d * 2, y + size);
        ctx.moveTo(x, y + d);
        ctx.lineTo(x + size, y + d);
        ctx.moveTo(x, y + d * 2);
        ctx.lineTo(x + size, y + d * 2);
        ctx.stroke();

      } else if (gridType === 'hui') {
        // 回字格 (同心方框)
        const inset = size * 0.2;
        ctx.strokeRect(x + inset, y + inset, size - inset * 2, size - inset * 2);
      }

      ctx.restore();
    }

    ctx.restore();
  }

  // 繪製國字
  drawCharacter(ctx, char, x, y, size, options, styleType = 'solid') {
    if (!char || styleType === 'blank') return;

    ctx.save();

    const fontSizeRatio = (options.fontSizeRatio || 86) / 100;
    const fontSize = Math.round(size * fontSizeRatio);
    const fontFamily = options.fontFamily || '"DFKai-SB", "BiauKai", "KaiTi", "cwTeXKai", "Noto Serif TC", serif';

    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 座標置中 + 微調
    const offsetX = (options.offsetX || 0) * (size / 100);
    const offsetY = (options.offsetY || 0) * (size / 100);
    const centerX = x + size / 2 + offsetX;
    // 楷體字形在 Canvas 中 baseline middle 通常略微偏上約 3%~5%，微調回中心
    const centerY = y + size / 2 + size * 0.02 + offsetY;

    if (styleType === 'solid') {
      // 實心墨字
      ctx.fillStyle = options.textColor || '#111111';
      ctx.fillText(char, centerX, centerY);

    } else if (styleType === 'hollow') {
      // 雙鉤空心字 (非常適合學生毛筆/鉛筆描邊臨摹)
      ctx.strokeStyle = options.hollowColor || '#222222';
      ctx.lineWidth = Math.max(1.2, size * 0.012);
      ctx.strokeText(char, centerX, centerY);

    } else if (styleType === 'tracing') {
      // 描紅淡灰浮水印 (直接在上面臨寫)
      ctx.fillStyle = options.traceColor || 'rgba(0, 0, 0, 0.18)';
      ctx.fillText(char, centerX, centerY);

    } else if (styleType === 'dotted') {
      // 虛線描邊字
      ctx.strokeStyle = options.hollowColor || '#444444';
      ctx.lineWidth = Math.max(1, size * 0.01);
      ctx.setLineDash([3, 3]);
      ctx.strokeText(char, centerX, centerY);
    }

    ctx.restore();
  }

  // 繪製側邊導引欄 (如同 1296x.webp 側邊的直排字 + 注音與頁碼)
  drawSidebarAnnotation(ctx, x, y, sentence, pageNum, options) {
    if (!sentence) return;

    ctx.save();
    const chars = Array.from(sentence);
    const charH = 32; // 每個小字的垂直間距
    const fontFamily = options.fontFamily || '"DFKai-SB", "BiauKai", "KaiTi", "cwTeXKai", "Noto Serif TC", serif';
    const showZhuyin = options.showZhuyin !== false;

    // 將句子底部錨定在網格下緣上方，向上延伸
    const bottomY = y - 10;
    const startCharY = bottomY - (chars.length - 1) * charH;

    // 繪製每一個字與注音
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      const cy = startCharY + i * charH;

      // 國字
      ctx.fillStyle = '#222222';
      ctx.font = `19px ${fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ch, x, cy);

      // 注音 (顯示在國字右側)
      if (showZhuyin) {
        const zhuyin = ZHUYIN_DICT[ch];
        if (zhuyin) {
          this.drawBopomofo(ctx, zhuyin, x + 16, cy);
        }
      }
    }

    // 繪製中文頁碼 (如：三) 位於下緣格線外側下方
    ctx.fillStyle = '#222222';
    ctx.font = `20px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(toChineseNumber(pageNum), x, y + 36);

    ctx.restore();
  }

  // 繪製標準台灣注音符號 (含聲調 ˊˇˋ˙)
  drawBopomofo(ctx, zhuyinStr, x, y) {
    ctx.save();
    ctx.fillStyle = '#444444';
    ctx.font = '10px "DFKai-SB", "BiauKai", "Noto Serif TC", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 解析注音符號與聲調
    // 聲調符號：ˊ ˇ ˋ ˙
    let tone = '';
    let symbols = [];

    for (const c of zhuyinStr) {
      if (['ˊ', 'ˇ', 'ˋ', '˙'].includes(c)) {
        tone = c;
      } else {
        symbols.push(c);
      }
    }

    const n = symbols.length;
    const lineSpacing = 10;
    const startY = y - ((n - 1) * lineSpacing) / 2;

    // 輕聲 (˙) 繪製在最上方
    if (tone === '˙') {
      ctx.fillText('˙', x, startY - 8);
    }

    // 繪製注音本體
    for (let i = 0; i < n; i++) {
      const sy = startY + i * lineSpacing;
      ctx.fillText(symbols[i], x, sy);
    }

    // 2, 3, 4 聲 (ˊ ˇ ˋ) 繪製在右側
    if (['ˊ', 'ˇ', 'ˋ'].includes(tone)) {
      // 聲調位置通常在最後一個注音符號的右上方
      const toneY = startY + (n - 1) * lineSpacing - 1;
      ctx.fillText(tone, x + 6, toneY);
    }

    ctx.restore();
  }

  // 繪製生字作業簿頁首資訊欄
  drawHeaderInfo(ctx, x, y, width, height, options) {
    ctx.save();
    ctx.strokeStyle = options.gridColor || '#c82423';
    ctx.fillStyle = '#222222';
    ctx.lineWidth = 1.2;

    const fontFamily = options.fontFamily || '"DFKai-SB", "BiauKai", "KaiTi", "cwTeXKai", "Noto Serif TC", serif';

    // 標題 (例如：國小書法作業簿)
    const title = options.headerTitle || '書法與生字練習簿';
    ctx.font = `bold 24px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(title, x + width / 2, y);

    // 下方資訊欄位 (班級、座號、姓名、成績評分)
    const infoY = y + 32;
    ctx.font = `16px ${fontFamily}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    const colW = width / 4;

    // 年級班級
    ctx.fillText('年　　班', x + 10, infoY);
    ctx.beginPath();
    ctx.moveTo(x + 75, infoY + 10);
    ctx.lineTo(x + colW - 20, infoY + 10);
    ctx.stroke();

    // 座號
    ctx.fillText('座號：', x + colW, infoY);
    ctx.beginPath();
    ctx.moveTo(x + colW + 50, infoY + 10);
    ctx.lineTo(x + colW * 2 - 20, infoY + 10);
    ctx.stroke();

    // 姓名
    ctx.fillText('姓名：', x + colW * 2, infoY);
    ctx.beginPath();
    ctx.moveTo(x + colW * 2 + 50, infoY + 10);
    ctx.lineTo(x + colW * 3 - 20, infoY + 10);
    ctx.stroke();

    // 成績評分方格
    const scoreX = x + colW * 3;
    const scoreBoxW = colW - 10;
    const scoreBoxH = 34;
    ctx.strokeRect(scoreX, infoY - 17, scoreBoxW, scoreBoxH);
    ctx.font = `14px ${fontFamily}`;
    ctx.fillText('成績評語', scoreX + 8, infoY);

    ctx.restore();
  }
}
