import React, { useState, useEffect } from 'react';
import { db } from '../lib/db';
import {
  Download,
  Upload,
  Trash2,
  HardDrive,
  ShieldCheck,
  Moon,
  Sun,
  Database,
  CheckCircle2,
  AlertTriangle,
  Info
} from 'lucide-react';

interface SettingsPageProps {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  onRefreshAll: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  theme,
  setTheme,
  onRefreshAll
}) => {
  const [storageUsage, setStorageUsage] = useState<{ usedMb: number; quotaMb: number } | null>(null);
  const [isPersisted, setIsPersisted] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Check Storage Quota
  useEffect(() => {
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then((est) => {
        const used = est.usage ? Math.round((est.usage / 1024 / 1024) * 10) / 10 : 0;
        const quota = est.quota ? Math.round(est.quota / 1024 / 1024) : 0;
        setStorageUsage({ usedMb: used, quotaMb: quota });
      });
    }

    if (navigator.storage && navigator.storage.persisted) {
      navigator.storage.persisted().then((p) => setIsPersisted(p));
    }
  }, []);

  const handleRequestPersistence = async () => {
    if (navigator.storage && navigator.storage.persist) {
      const persisted = await navigator.storage.persist();
      setIsPersisted(persisted);
      if (persisted) alert('მონაცემთა მუდმივი შენახვის უფლება მიღებულია!');
    }
  };

  // Export entire database as JSON backup
  const handleExportBackup = async () => {
    const backupData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      materials: await db.materials.toArray(),
      folders: await db.folders.toArray(),
      docTrees: await db.docTrees.toArray(),
      notes: await db.notes.toArray(),
      flashcards: await db.flashcards.toArray(),
      quizQuestions: await db.quizQuestions.toArray(),
      fillBlanks: await db.fillBlanks.toArray(),
      mindmaps: await db.mindmaps.toArray(),
      attempts: await db.attempts.toArray(),
      focusSessions: await db.focusSessions.toArray()
    };

    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `სწავლა_სარეზერვო_ასლი_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content);

        if (data.materials && Array.isArray(data.materials)) {
          await db.materials.bulkPut(data.materials);
        }
        if (data.folders && Array.isArray(data.folders)) {
          await db.folders.bulkPut(data.folders);
        }
        if (data.docTrees && Array.isArray(data.docTrees)) {
          await db.docTrees.bulkPut(data.docTrees);
        }
        if (data.notes && Array.isArray(data.notes)) {
          await db.notes.bulkPut(data.notes);
        }
        if (data.flashcards && Array.isArray(data.flashcards)) {
          await db.flashcards.bulkPut(data.flashcards);
        }
        if (data.quizQuestions && Array.isArray(data.quizQuestions)) {
          await db.quizQuestions.bulkPut(data.quizQuestions);
        }
        if (data.fillBlanks && Array.isArray(data.fillBlanks)) {
          await db.fillBlanks.bulkPut(data.fillBlanks);
        }
        if (data.mindmaps && Array.isArray(data.mindmaps)) {
          await db.mindmaps.bulkPut(data.mindmaps);
        }

        setImportStatus('მონაცემები წარმატებით აღდგა!');
        onRefreshAll();
      } catch (err) {
        setImportStatus('შეცდომა: არასწორი სარეზერვო ფაილის ფორმატი');
      }
    };
    reader.readAsText(file);
  };

  // Wipe all data
  const handleWipeDatabase = async () => {
    if (window.confirm('გაფრთხილება: ნამდვილად გსურთ ყველა მონაცემის, მასალისა და ბარათის წაშლა? ეს ქმედება შეუქცევადია!')) {
      await db.delete();
      window.location.reload();
    }
  };

  return (
    <div className="max-w-3xl mx-auto my-8 px-4 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-serif text-slate-900 dark:text-white">
          პარამეტრები და სარეზერვო ასლი
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          მართეთ ლოკალური მეხსიერება, სარეზერვო ასლები და ვიზუალური იერსახე.
        </p>
      </div>

      {/* Theme setting */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <h2 className="text-sm font-bold font-serif text-slate-900 dark:text-white">
          ვიზუალური თემა
        </h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setTheme('light')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
              theme === 'light'
                ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Sun className="w-4 h-4" />
            <span>ნათელი რეჟიმი</span>
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
              theme === 'dark'
                ? 'bg-indigo-950/80 border-indigo-500 text-indigo-300'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Moon className="w-4 h-4" />
            <span>მუქი რეჟიმი</span>
          </button>
        </div>
      </div>

      {/* Local Storage & Privacy */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <h2 className="text-sm font-bold font-serif text-slate-900 dark:text-white">
            100% ლოკალური მეხსიერება (IndexedDB)
          </h2>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          თქვენი ყველა მასალა, ჩანაწერი, ბარათი და ქვიზი ინახება მხოლოდ თქვენს მოწყობილობაზე. არანაირი გარე სერვერი ან ღრუბლოვანი გადაცემა არ ხორციელდება.
        </p>

        {storageUsage && (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">გამოყენებული მეხსიერება:</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {storageUsage.usedMb} MB / {storageUsage.quotaMb} MB
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">მუდმივი შენახვის სტატუსი:</span>
              <span className="font-semibold text-emerald-600">
                {isPersisted ? 'აქტიურია ✓' : 'ჩვეულებრივი'}
              </span>
            </div>
            {!isPersisted && (
              <button
                onClick={handleRequestPersistence}
                className="mt-2 text-indigo-600 hover:underline font-medium text-[11px] block"
              >
                მუდმივი შენახვის უფლების მოთხოვნა
              </button>
            )}
          </div>
        )}
      </div>

      {/* Backup and Restore */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <h2 className="text-sm font-bold font-serif text-slate-900 dark:text-white">
          სარეზერვო ასლი (ექსპორტი / იმპორტი)
        </h2>
        <p className="text-xs text-slate-500">
          ჩამოტვირთეთ ყველა მონაცემის ასლი JSON ფაილად, რათა გადაიტანოთ სხვა კომპიუტერზე ან შეინახოთ უსაფრთხოდ.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={handleExportBackup}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>სრული ასლის ჩამოტვირთვა (.json)</span>
          </button>

          <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer transition-colors">
            <Upload className="w-4 h-4" />
            <span>ასლის აღდგენა (.json)</span>
            <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
          </label>
        </div>

        {importStatus && (
          <p className="text-xs font-medium text-emerald-600 pt-1">{importStatus}</p>
        )}
      </div>

      {/* Danger Zone */}
      <div className="p-6 rounded-2xl bg-red-50/30 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 space-y-3">
        <h2 className="text-sm font-bold font-serif text-red-900 dark:text-red-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <span>მონაცემების სრული გასუფთავება</span>
        </h2>
        <p className="text-xs text-red-700 dark:text-red-400">
          წაშლის ყველა ატვირთულ მასალას, ბარათებს, ქვიზებს და პროგრესის ისტორიას თქვენი ბრაუზერიდან.
        </p>
        <button
          onClick={handleWipeDatabase}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          <span>ყველა მონაცემის წაშლა</span>
        </button>
      </div>
    </div>
  );
};
