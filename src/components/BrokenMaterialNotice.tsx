import React from 'react';
import { AlertTriangle, ArrowLeft, Trash2 } from 'lucide-react';
import { db, MaterialRecord } from '../lib/db';
import type { Notes } from '../lib/engine/types';

/** Older versions read PDF/DOCX as binary and produced thousands of junk sections that froze rendering. */
const MAX_RENDERABLE_SECTIONS = 150;

export function isBrokenMaterial(material: MaterialRecord, notes: Notes | null): boolean {
  if (material.status === 'error') return true;
  return !!notes && notes.sections.length > MAX_RENDERABLE_SECTIONS;
}

export const BrokenMaterialNotice: React.FC<{
  material: MaterialRecord;
  onBack: () => void;
  onDeleted: () => void;
}> = ({ material, onBack, onDeleted }) => {
  const handleDelete = async () => {
    const id = material.id;
    await db.transaction(
      'rw',
      [db.materials, db.notes, db.docTrees, db.flashcards, db.quizQuestions, db.fillBlanks, db.mindmaps],
      async () => {
        await db.materials.delete(id);
        await db.notes.delete(id);
        await db.docTrees.delete(id);
        await db.flashcards.where('materialId').equals(id).delete();
        await db.quizQuestions.where('materialId').equals(id).delete();
        await db.fillBlanks.where('materialId').equals(id).delete();
        await db.mindmaps.delete(id);
      }
    );
    onDeleted();
  };

  return (
    <div className="max-w-xl mx-auto my-12 p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md text-center">
      <div className="w-12 h-12 mx-auto rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">ეს მასალა ხელახლა უნდა ატვირთოთ</h2>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        „{material.title}“ აპლიკაციის ძველ ვერსიაში დამუშავდა და ფაილის ტექსტი სწორად ვერ წაიკითხა. წაშალეთ და
        ატვირთეთ ფაილი თავიდან — ახლა PDF, Word და PowerPoint სწორად მუშავდება.
      </p>
      <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={onBack}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="w-4 h-4" /> უკან
        </button>
        <button
          onClick={handleDelete}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-semibold text-white"
        >
          <Trash2 className="w-4 h-4" /> წაშლა
        </button>
      </div>
    </div>
  );
};
