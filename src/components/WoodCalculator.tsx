import React, { useState, useEffect, useRef } from 'react';
import { 
  Calculator, 
  Trash2, 
  Copy, 
  RotateCcw, 
  Plus, 
  Minus, 
  Divide, 
  X, 
  Percent, 
  CornerDownLeft, 
  HelpCircle,
  Hash,
  Scale,
  Sparkles,
  Logs
} from 'lucide-react';

interface CalculationHistoryItem {
  id: string;
  expression: string;
  result: string;
  timestamp: string;
}

export default function WoodCalculator() {
  const [activeTab, setActiveTab2] = useState<'standard' | 'wood'>('standard');
  
  // Standard Calculator State
  const [calcInput, setCalcInput] = useState<string>('');
  const [calcFormula, setCalcFormula] = useState<string>('');
  const [calcHistory, setCalcHistory] = useState<CalculationHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('Wood_calculator_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Wood calculator state
  const [woodType, setWoodType] = useState<'sawn' | 'round'>('sawn');
  const [sawnLength, setSawnLength] = useState<string>('2.5'); // meter
  const [sawnWidth, setSawnWidth] = useState<string>('12'); // cm
  const [sawnThickness, setSawnThickness] = useState<string>('2'); // cm
  const [sawnQty, setSawnQty] = useState<string>('10');
  
  const [roundLength, setRoundLength] = useState<string>('4.0'); // meter
  const [roundDiameter, setRoundDiameter] = useState<string>('24'); // cm
  const [roundQty, setRoundQty] = useState<string>('1');

  const [woodResult, setWoodResult] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem('Wood_calculator_history', JSON.stringify(calcHistory));
  }, [calcHistory]);

  // Calculate Sawn / Round wood volume instantly
  useEffect(() => {
    if (woodType === 'sawn') {
      const l = parseFloat(sawnLength) || 0;
      const w = parseFloat(sawnWidth) || 0; // cm
      const t = parseFloat(sawnThickness) || 0; // cm
      const q = parseFloat(sawnQty) || 0;
      
      // Volume = length (m) * width (m) * thickness (m) * qty
      // width in cm -> m is w / 100. thickness in cm -> m is t / 100
      const vol = l * (w / 100) * (t / 100) * q;
      setWoodResult(parseFloat(vol.toFixed(4)));
    } else {
      const l = parseFloat(roundLength) || 0;
      const d = parseFloat(roundDiameter) || 0; // cm
      const q = parseFloat(roundQty) || 0;
      
      // Volume = Pi * R^2 * length * qty
      // Diameter d in cm -> radius r in meters is (d / 2) / 100 = d / 200
      const r = d / 200;
      const vol = Math.PI * Math.pow(r, 2) * l * q;
      setWoodResult(parseFloat(vol.toFixed(4)));
    }
  }, [woodType, sawnLength, sawnWidth, sawnThickness, sawnQty, roundLength, roundDiameter, roundQty]);

  // Handle calculator key sound effect
  const playClickSound = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.08);
      
      gain.gain.setValueAtTime(0.015, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {
      // Ignore audio errors gracefully
    }
  };

  // Keyboard support for standard calculator
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeTab !== 'standard') return;
      
      // Prevent focus issues
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      const key = e.key;
      if (/[0-9]/.test(key)) {
        e.preventDefault();
        handlePressKey(key);
      } else if (['+', '-', '*', '/'].includes(key)) {
        e.preventDefault();
        const operatorMap: { [key: string]: string } = { '*': '×', '/': '÷', '+': '+', '-': '-' };
        handlePressKey(operatorMap[key]);
      } else if (key === '.' || key === ',') {
        e.preventDefault();
        handlePressKey('.');
      } else if (key === 'Enter' || key === '=') {
        e.preventDefault();
        handleCalculate();
      } else if (key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (key === 'Escape') {
        e.preventDefault();
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, calcInput, calcFormula]);

  const handlePressKey = (char: string) => {
    playClickSound();
    
    // Auto-replace operational characters if typed in succession
    const isOperator = (c: string) => ['+', '-', '×', '÷'].includes(c);
    
    if (isOperator(char)) {
      if (calcInput === '' && calcFormula !== '') {
        // Continue from existing formula
        const lastChar = calcFormula.trim().slice(-1);
        if (isOperator(lastChar)) {
          setCalcFormula(calcFormula.trim().slice(0, -1) + ` ${char} `);
        } else {
          setCalcFormula(calcFormula + ` ${char} `);
        }
        return;
      }
      
      if (calcInput !== '') {
        setCalcFormula((prev) => prev + calcInput + ` ${char} `);
        setCalcInput('');
      }
    } else {
      // Number or decimal
      if (char === '.') {
        if (calcInput.includes('.')) return; // No duplicate decimals
        if (calcInput === '') {
          setCalcInput('0.');
          return;
        }
      }
      setCalcInput((prev) => prev + char);
    }
  };

  const handleBackspace = () => {
    playClickSound();
    setCalcInput((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    playClickSound();
    setCalcInput('');
    setCalcFormula('');
  };

  const handleCalculate = () => {
    playClickSound();
    let finalExpression = calcFormula + calcInput;
    if (!finalExpression.trim()) return;

    // Sanitize mathematical sequence
    let mathFormatted = finalExpression
      .replace(/×/g, '*')
      .replace(/÷/g, '/');

    try {
      // Clean trailing operators
      const lastChar = mathFormatted.trim().slice(-1);
      if (['+', '-', '*', '/'].includes(lastChar)) {
        mathFormatted = mathFormatted.trim().slice(0, -1);
        finalExpression = finalExpression.trim().slice(0, -1);
      }

      // Safe calculation using Function constructor (avoiding dangerous eval or parser bloating)
      const calculatedValue = new Function(`return (${mathFormatted})`)();
      
      if (isNaN(calculatedValue) || !isFinite(calculatedValue)) {
        throw new Error('Khuyết kết quả');
      }

      const cleanResult = parseFloat(Number(calculatedValue).toFixed(8)).toString();

      // Add to history list
      const newItem: CalculationHistoryItem = {
        id: Date.now().toString(),
        expression: finalExpression,
        result: cleanResult,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };

      setCalcHistory((prev) => [newItem, ...prev].slice(0, 30));
      setCalcInput(cleanResult);
      setCalcFormula('');
    } catch {
      setCalcInput('LỖI CÚ PHÁP');
      setTimeout(() => setCalcInput(''), 1500);
    }
  };

  const handleClearHistory = () => {
    setCalcHistory([]);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const injectWoodResult = () => {
    // Add wood result directly to the standard calculator
    playClickSound();
    setCalcInput(woodResult.toString());
    setActiveTab2('standard');
  };

  return (
    <div className="space-y-6 text-left animate-fadeIn">
      
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 border border-slate-800 rounded-2xl p-5 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="z-10">
          <h2 className="text-base md:text-lg font-black tracking-wider uppercase text-white flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 bg-teal-400 rounded-full animate-pulse shadow-xs"></span>
            MÁY TÍNH TIỆN ÍCH (CALCULATOR MODULE)
          </h2>
          <p className="text-[11px] text-slate-300 leading-relaxed max-w-xl font-medium mt-1">
            Thiết bị hỗ trợ đo đạc khối lượng, cộng gộp sản lượng keo xẻ, gỗ tròn thực tế và tính toán tổng số tiền chi trả nhanh chóng.
          </p>
        </div>
      </div>

      {/* Tab Selectors */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab2('standard')}
          className={`px-5 py-3 text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 border-b-2 ${
            activeTab === 'standard'
              ? 'border-teal-600 text-teal-800 bg-teal-50/20'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <Calculator className="w-4 h-4" />
          Máy tính phổ thông
        </button>
        <button
          onClick={() => setActiveTab2('wood')}
          className={`px-5 py-3 text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 border-b-2 ${
            activeTab === 'wood'
              ? 'border-teal-600 text-teal-800 bg-teal-50/20'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <Logs className="w-4 h-4" />
          Tính nhanh thể tích gỗ (m³)
        </button>
      </div>

      {/* Tab Context Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Main Work Area */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs flex flex-col justify-between">
          
          {activeTab === 'standard' ? (
            /* STANDARD CALCULATOR UI */
            <div className="max-w-md mx-auto w-full space-y-4">
              
              {/* LED Monitor Display Screen */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-right font-mono text-white shadow-inner relative overflow-hidden">
                <div className="absolute left-2 top-2 text-[9px] text-[#2dd4bf]/40 font-bold uppercase tracking-widest select-none">
                  WOOD MATH PRO 12X
                </div>
                {/* Expression Formula History Track */}
                <div className="text-xs text-slate-400 min-h-[1.25rem] truncate select-all">
                  {calcFormula || <span className="opacity-0">history display</span>}
                </div>
                {/* Current Active Output */}
                <div className="text-2xl font-bold tracking-tight text-[#2dd4bf] min-h-[2.5rem] mt-1 select-all truncate">
                  {calcInput || '0'}
                </div>
              </div>

              {/* Utility Shortcut Actions */}
              <div className="flex justify-between items-center bg-slate-50 border border-slate-150 rounded-xl px-3 py-2 text-slate-600 text-xs font-semibold">
                <span className="text-[10px] text-slate-400">Ấn phím số để nhập trực tiếp</span>
                <button
                  type="button"
                  onClick={() => {
                    if (calcInput) {
                      copyToClipboard(calcInput);
                    }
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 rounded-lg transition"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copied ? 'Đã sao chép' : 'Sao chép kết quả'}
                </button>
              </div>

              {/* KEYPAD GRID */}
              <div className="grid grid-cols-4 gap-2">
                {/* Clear Controls */}
                <button
                  onClick={handleClear}
                  className="p-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold rounded-xl transition cursor-pointer text-sm font-sans"
                >
                  AC
                </button>
                <button
                  onClick={handleBackspace}
                  className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl transition cursor-pointer text-sm font-sans flex items-center justify-center"
                >
                  C
                </button>
                <button
                  onClick={() => handlePressKey('÷')}
                  className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold rounded-xl transition cursor-pointer text-sm"
                >
                  ÷
                </button>
                <button
                  onClick={() => handlePressKey('×')}
                  className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold rounded-xl transition cursor-pointer text-sm"
                >
                  ×
                </button>

                {/* Row 7 8 9 */}
                <button
                  onClick={() => handlePressKey('7')}
                  className="p-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-black rounded-xl transition cursor-pointer text-base shadow-4xs"
                >
                  7
                </button>
                <button
                  onClick={() => handlePressKey('8')}
                  className="p-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-black rounded-xl transition cursor-pointer text-base shadow-4xs"
                >
                  8
                </button>
                <button
                  onClick={() => handlePressKey('9')}
                  className="p-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-black rounded-xl transition cursor-pointer text-base shadow-4xs"
                >
                  9
                </button>
                <button
                  onClick={() => handlePressKey('-')}
                  className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold rounded-xl transition cursor-pointer text-base"
                >
                  -
                </button>

                {/* Row 4 5 6 */}
                <button
                  onClick={() => handlePressKey('4')}
                  className="p-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-black rounded-xl transition cursor-pointer text-base shadow-4xs"
                >
                  4
                </button>
                <button
                  onClick={() => handlePressKey('5')}
                  className="p-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-black rounded-xl transition cursor-pointer text-base shadow-4xs"
                >
                  5
                </button>
                <button
                  onClick={() => handlePressKey('6')}
                  className="p-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-black rounded-xl transition cursor-pointer text-base shadow-4xs"
                >
                  6
                </button>
                <button
                  onClick={() => handlePressKey('+')}
                  className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold rounded-xl transition cursor-pointer text-base"
                >
                  +
                </button>

                {/* Row 1 2 3 */}
                <button
                  onClick={() => handlePressKey('1')}
                  className="p-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-black rounded-xl transition cursor-pointer text-base shadow-4xs"
                >
                  1
                </button>
                <button
                  onClick={() => handlePressKey('2')}
                  className="p-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-black rounded-xl transition cursor-pointer text-base shadow-4xs"
                >
                  2
                </button>
                <button
                  onClick={() => handlePressKey('3')}
                  className="p-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-black rounded-xl transition cursor-pointer text-base shadow-4xs"
                >
                  3
                </button>
                
                {/* Equals Button - Spans Row Height */}
                <button
                  onClick={handleCalculate}
                  rowSpan={2}
                  className="row-span-2 bg-gradient-to-b from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white font-extrabold rounded-xl transition cursor-pointer shadow-sm text-lg flex items-center justify-center border-b-[3px] border-teal-800 active:border-b-0"
                >
                  =
                </button>

                {/* Row 0 . */}
                <button
                  onClick={() => handlePressKey('0')}
                  className="col-span-2 p-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-black rounded-xl transition cursor-pointer text-base shadow-4xs"
                >
                  0
                </button>
                <button
                  onClick={() => handlePressKey('.')}
                  className="p-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-black rounded-xl transition cursor-pointer text-base shadow-4xs"
                >
                  .
                </button>
              </div>

            </div>
          ) : (
            /* SPECIALIZED WOOD VOLUME INTERACTIVE ESTIMATOR */
            <div className="space-y-6">
              
              {/* Type Switcher */}
              <div className="flex bg-slate-105 border border-slate-205 rounded-xl p-1 gap-1 w-fit">
                <button
                  type="button"
                  onClick={() => setWoodType('sawn')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                    woodType === 'sawn'
                      ? 'bg-white text-slate-900 shadow-xs ring-1 ring-black/5'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Tính Keo Xẻ / Gỗ Sấy
                </button>
                <button
                  type="button"
                  onClick={() => setWoodType('round')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                    woodType === 'round'
                      ? 'bg-white text-slate-900 shadow-xs ring-1 ring-black/5'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Tính Gỗ Tròn / Logs
                </button>
              </div>

              {woodType === 'sawn' ? (
                /* SAWN WOOD ESTIMATION */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                      Chiều dài (m)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={sawnLength}
                      onChange={(e) => setSawnLength(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-250 focus:bg-white focus:ring-1 focus:ring-teal-500 rounded-xl px-3.5 py-2.5 font-sans text-sm font-semibold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                      Chiều rộng / Bản rộng (cm)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={sawnWidth}
                      onChange={(e) => setSawnWidth(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-250 focus:bg-white focus:ring-1 focus:ring-teal-500 rounded-xl px-3.5 py-2.5 font-sans text-sm font-semibold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                      Chiều dầy / Độ dầy (cm)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={sawnThickness}
                      onChange={(e) => setSawnThickness(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-250 focus:bg-white focus:ring-1 focus:ring-teal-500 rounded-xl px-3.5 py-2.5 font-sans text-sm font-semibold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                      Số lượng thanh / bó (qty)
                    </label>
                    <input
                      type="number"
                      step="1"
                      value={sawnQty}
                      onChange={(e) => setSawnQty(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-250 focus:bg-white focus:ring-1 focus:ring-teal-500 rounded-xl px-3.5 py-2.5 font-sans text-sm font-semibold focus:outline-none"
                    />
                  </div>
                </div>
              ) : (
                /* ROUND WOOD ESTIMATION */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                      Chiều dài gốc rễ (m)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={roundLength}
                      onChange={(e) => setRoundLength(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-250 focus:bg-white focus:ring-1 focus:ring-teal-500 rounded-xl px-3.5 py-2.5 font-sans text-sm font-semibold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                      Đường kính vanh / D (cm)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={roundDiameter}
                      onChange={(e) => setRoundDiameter(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-250 focus:bg-white focus:ring-1 focus:ring-teal-500 rounded-xl px-3.5 py-2.5 font-sans text-sm font-semibold focus:outline-none"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                      Số lượng cây gỗ (qty)
                    </label>
                    <input
                      type="number"
                      step="1"
                      value={roundQty}
                      onChange={(e) => setRoundQty(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-250 focus:bg-white focus:ring-1 focus:ring-teal-500 rounded-xl px-3.5 py-2.5 font-sans text-sm font-semibold focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* WOOD CALCULATION RESULTS PANEL */}
              <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-md select-text">
                <div>
                  <span className="text-[10px] text-teal-400 font-black uppercase tracking-widest block mb-1">
                    KẾT QUẢ TÍNH THỂ TÍCH LÂM SẢN
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-3xl font-black text-amber-300">
                      {woodResult.toFixed(4)}
                    </span>
                    <span className="text-sm font-extrabold text-slate-350">
                      m³ (Khối thực tế)
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-400 mt-1.5 font-medium leading-normal">
                    {woodType === 'sawn' 
                      ? `Keo xẻ: Dài ${sawnLength}m × Rộng ${sawnWidth}cm × Dầy ${sawnThickness}cm (Số lượng: ${sawnQty} thanh)`
                      : `Gỗ tròn: Dài ${roundLength}m × Đường kính ${roundDiameter}cm (Số lượng: ${roundQty} lốc)`
                    }
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2.5 w-full md:w-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(woodResult.toString())}
                    className="flex-1 bg-slate-800 hover:bg-slate-750 text-white border border-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Copy className="w-4 h-4" />
                    {copied ? 'Đã sao chép' : 'Sao chép m³'}
                  </button>
                  <button
                    type="button"
                    onClick={injectWoodResult}
                    className="flex-1 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Chuyển sang máy tính
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* History Log Area on Right */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs flex flex-col justify-between min-h-[350px]">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <span className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4 text-teal-600" />
                Lịch sử tính toán
              </span>
              {calcHistory.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="text-[10px] bg-red-50 hover:bg-red-100 text-red-600 font-extrabold px-2 py-1 rounded transition flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Xóa sạch
                </button>
              )}
            </div>

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {calcHistory.length === 0 ? (
                <div className="text-center py-10 text-slate-400 italic text-[11.5px]">
                  Chưa có lịch sử tính toán nào trong phiên này
                </div>
              ) : (
                calcHistory.map((item) => (
                  <div 
                    key={item.id} 
                    className="bg-slate-50/70 border border-slate-150 p-3 rounded-xl hover:bg-slate-100/50 transition cursor-pointer text-left relative group font-mono select-none"
                    onClick={() => {
                      playClickSound();
                      setCalcInput(item.result);
                    }}
                    title="Nhấp để chèn lại kết quả này"
                  >
                    <span className="absolute right-2.5 top-2 text-[9px] text-slate-400 font-bold font-sans">
                      {item.timestamp}
                    </span>
                    <div className="text-xs text-slate-500 truncate max-w-[85%]">
                      {item.expression}
                    </div>
                    <div className="text-sm font-black text-slate-800 tracking-tight mt-1 truncate">
                      = {item.result}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-150 rounded-xl p-3 mt-4 text-[11px] text-amber-800 leading-relaxed font-medium">
            <span className="font-extrabold block uppercase tracking-wider text-[10px] text-amber-900 mb-1">
              💡 mẹo tính nhanh lâm sản
            </span>
            Bạn có thể dùng TAB thứ 2 để quy đổi nhanh kích thước ra m³, sau đó bấm nút chuyển sang máy tính để tiếp tục làm các phép toán liên quan cực kỳ hữu ích.
          </div>

        </div>

      </div>

    </div>
  );
}
