import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: '1', desc: 'ჩანაწერების მოდულზე გადასვლა' },
    { key: '2', desc: 'ქვიზის მოდულზე გადასვლა' },
    { key: '3', desc: 'ცოდნის რუკაზე გადასვლა' },
    { key: '4', desc: 'ბარათების მოდულზე გადასვლა' },
    { key: '5', desc: 'წერით ტესტზე გადასვლა' },
    { key: '6', desc: 'ორიგინალ კონტენტზე გადასვლა' },
    { key: '[', desc: 'გვერდითი პანელის ჩაკეცვა / გაშლა' },
    { key: 'Space', desc: 'ბარათის გადაბრუნება' },
    { key: '← / →', desc: '„არ ვიცოდი“ / „ვიცოდი“ ბარათებში ან ნავიგაცია' },
    { key: '1 – 4', desc: 'ქვიზში პასუხის ვარიანტის არჩევა' },
    { key: 'Enter', desc: 'პასუხის შემოწმება და შემდეგ კითხვაზე გადასვლა' },
    { key: '?', desc: 'ამ შორთქათების ფანჯრის ჩვენება' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              კლავიატურის შორთქათები
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            title="დახურვა"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
          {shortcuts.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-slate-50 dark:bg-slate-800/60"
            >
              <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                {item.desc}
              </span>
              <kbd className="px-2 py-1 text-xs font-mono font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded shadow-xs">
                {item.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
          >
            გასაგებია
          </button>
        </div>
      </div>
    </div>
  );
};
