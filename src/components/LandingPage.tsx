import React from 'react';
import {
  BookOpen,
  ArrowRight,
  ShieldCheck,
  WifiOff,
  Cpu,
  Layers,
  HelpCircle,
  Network,
  FileText,
  Edit3,
  FileCode,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

interface LandingPageProps {
  onStartLearning: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStartLearning }) => {
  const modules = [
    {
      title: 'ჩანაწერები',
      desc: 'სტრუქტურირებული კონსპექტი, დანომრილი სექციები, საკვანძო ტერმინები და შეჯამება.',
      icon: FileText,
      color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/60'
    },
    {
      title: 'ქვიზი',
      desc: 'მრავალარჩევანიანი ტესტები მკაცრად ტიპიზირებული არასწორი ვარიანტებითა და წყაროს განმარტებებით.',
      icon: HelpCircle,
      color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60'
    },
    {
      title: 'ცოდნის რუკა',
      desc: 'ინტერაქტიული იერარქიული რუკა მასალის მთლიანი სურათის აღსაქმელად.',
      icon: Network,
      color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/60'
    },
    {
      title: 'ბარათები',
      desc: '3D გადაბრუნებადი ბარათები ინტერვალური გამეორების (FSRS) ალგორითმით.',
      icon: Layers,
      color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60'
    },
    {
      title: 'წერითი ტესტი',
      desc: 'გამოტოვებული სიტყვებისა და თარიღების შევსება ჭკვიანი გრამატიკული შემოწმებით.',
      icon: Edit3,
      color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/60'
    },
    {
      title: 'ორიგინალი კონტენტი',
      desc: 'დოკუმენტის სრული ხედი, ძიება და წყაროების ზუსტი სინქრონიზაცია.',
      icon: FileCode,
      color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/60'
    }
  ];

  return (
    <div className="space-y-20 py-8 lg:py-16 max-w-6xl mx-auto px-6">
      {/* Hero Section */}
      <section className="text-center space-y-6 pt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
          <Cpu className="w-3.5 h-3.5" />
          <span>100% ლოკალური · არანაირი AI და LLM ჰალუცინაციები</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold font-serif text-slate-900 dark:text-white tracking-tight max-w-4xl mx-auto leading-tight">
          აქციე ნებისმიერი სასწავლო მასალა 6 ინტერაქტიულ მოდულად
        </h1>

        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
          ატვირთე PDF, Word, PowerPoint, სურათი ან ტექსტი. ჩვენი დეტერმინისტული NLP ძრავი წამებში შეგიქმნის ჩანაწერებს, ქვიზს, ცოდნის რუკას, ბარათებსა და წერით ტესტს.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <button
            onClick={onStartLearning}
            className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all"
          >
            <span>დაიწყე უფასოდ</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-400">
          რეგისტრაცია არ არის საჭირო · მონაცემები ინახება მხოლოდ თქვენს მოწყობილობაზე
        </p>
      </section>

      {/* 3 Value Pillars */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold font-serif text-slate-900 dark:text-white">
            100% კონფიდენციალური
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            თქვენი ფაილები არასოდეს ტოვებს თქვენს კომპიუტერს. დამუშავება ხდება უშუალოდ ბრაუზერში.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
            <WifiOff className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold font-serif text-slate-900 dark:text-white">
            სრული ოფლაინ რეჟიმი
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            პლატფორმა მუშაობს ინტერნეტის გარეშე. ისწავლეთ მეტროში, მოგზაურობისას ან ქსელის გათიშვისას.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
            <Cpu className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold font-serif text-slate-900 dark:text-white">
            ზუსტი ალგორითმები
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            არანაირი შეთხზული ფაქტები. ყველა კითხვა და ბარათი მკაცრად ეფუძნება თქვენს მიერ ატვირთულ ტექსტს.
          </p>
        </div>
      </section>

      {/* 6 Study Modules Showcase */}
      <section className="space-y-8 pt-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold font-serif text-slate-900 dark:text-white">
            6 ურთიერთდაკავშირებული სასწავლო მოდული
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
            ყოველი დოკუმენტიდან ავტომატურად იქმნება სრული სასწავლო ეკოსისტემა:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((m, idx) => {
            const Icon = m.icon;
            return (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${m.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold font-serif text-slate-900 dark:text-white">
                  {m.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {m.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How it works 3 steps */}
      <section className="p-8 sm:p-12 rounded-3xl bg-slate-900 text-white space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold font-serif">როგორ მუშაობს?</h2>
          <p className="text-xs text-slate-400">სამი მარტივი ნაბიჯი ცოდნის ასათვისებლად</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="space-y-2">
            <span className="text-2xl font-mono font-bold text-indigo-400">01</span>
            <h3 className="text-sm font-bold font-serif">ატვირთე მასალა</h3>
            <p className="text-xs text-slate-400">ჩააგდე ლექცია, წიგნის თავი, კონსპექტი ან ტექსტი.</p>
          </div>
          <div className="space-y-2">
            <span className="text-2xl font-mono font-bold text-indigo-400">02</span>
            <h3 className="text-sm font-bold font-serif">ალგორითმული დამუშავება</h3>
            <p className="text-xs text-slate-400">პროგრამა ამოიცნობს სტრუქტურას, ტერმინებს, თარიღებსა და ფაქტებს.</p>
          </div>
          <div className="space-y-2">
            <span className="text-2xl font-mono font-bold text-indigo-400">03</span>
            <h3 className="text-sm font-bold font-serif">ისწავლე და შეამოწმე თავი</h3>
            <p className="text-xs text-slate-400">გაიმეორე ბარათებით, გაიარე ქვიზი და ჩააბარე წერითი ტესტი.</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="space-y-6 pt-6">
        <h2 className="text-xl sm:text-2xl font-bold font-serif text-slate-900 dark:text-white text-center">
          ხშირად დასმული კითხვები
        </h2>

        <div className="space-y-4 max-w-3xl mx-auto">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
            <h3 className="text-sm font-bold font-serif text-slate-900 dark:text-white">
              როგორი მასალა მუშაობს საუკეთესოდ?
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              ალგორითმული გენერაცია საუკეთესო შედეგს იძლევა კარგად სტრუქტურირებულ მასალაზე: სათაურები, სიები, გამუქებული ტერმინები, თარიღები და განმარტებები ფორმით „X არის Y“ ან „X ეწოდება Y-ს“.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
            <h3 className="text-sm font-bold font-serif text-slate-900 dark:text-white">
              რატომ არ გამოიყენება AI ან LLM?
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              ჩვენი მიზანია 100%-ით საიმედო, დეტერმინისტული და დაცული სისტემა. არანაირი ჰალუცინაციები, არანაირი სერვერული ხარჯი და სრული კონფიდენციალურობა — თქვენი ფაილები არ იგზავნება არცერთ გარე AI პროვაიდერთან.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
            <h3 className="text-sm font-bold font-serif text-slate-900 dark:text-white">
              შემიძლია თუ არა კითხვებისა და ბარათების ხელით ჩასწორება?
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              დიახ, აპლიკაციას აქვს სრული „გადახედვისა და რედაქტირების“ რეჟიმი, სადაც შეგიძლიათ შეცვალოთ, წაშალოთ ან დაამატოთ ნებისმიერი ბარათი თუ ტესტის კითხვა.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="text-center py-10 space-y-4">
        <h2 className="text-2xl font-bold font-serif text-slate-900 dark:text-white">
          მზად ხარ ეფექტური სწავლისთვის?
        </h2>
        <button
          onClick={onStartLearning}
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md transition-all"
        >
          <span>სასწავლო მასალებზე გადასვლა</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </section>
    </div>
  );
};
