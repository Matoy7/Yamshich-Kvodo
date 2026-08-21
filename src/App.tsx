// Resolved against Vite's BASE_URL so assets keep working when the site is
// deployed under a GitHub Pages sub-path (e.g. /REPO_NAME/assets/...).
const assetPathPrefix = `${import.meta.env.BASE_URL}assets`;

const imgImage = `${assetPathPrefix}/b4624.png`;
const imgProfile = `${assetPathPrefix}/02a96.png`;
const imgPersonIcon = `${assetPathPrefix}/8fa3b.svg`;
const imgQuoteMark = `${assetPathPrefix}/e9844.svg`;
const imgBell = `${assetPathPrefix}/47618.svg`;
const imgHomeIcon = `${assetPathPrefix}/1f5ca.svg`;
const imgPencilIcon = `${assetPathPrefix}/3e727.svg`;
const imgChatIcon = `${assetPathPrefix}/a099a.svg`;

type Sentence = {
  text: React.ReactNode;
  completions: number;
};

const sentences: Sentence[] = [
  { text: "אישה טובה זה כמו...", completions: 48 },
  {
    text: (
      <>
        {"הדבר שהכי הייתי רוצה "}
        <br aria-hidden />
        לעשות בקיץ הזה...
      </>
    ),
    completions: 48,
  },
  { text: "סקס טוב זה כמו יין טוב...", completions: 48 },
  {
    text: (
      <>
        יותר קשה לביבי להגיד את
        <br aria-hidden />
        האמת מאשר...
      </>
    ),
    completions: 48,
  },
  {
    text: (
      <>
        יותר קשה לביבי להגיד את
        <br aria-hidden />
        האמת מאשר...
      </>
    ),
    completions: 48,
  },
  {
    text: (
      <>
        יותר קשה לביבי להגיד את
        <br aria-hidden />
        האמת מאשר...
      </>
    ),
    completions: 48,
  },
];

function SentenceCard({ text, completions }: Sentence) {
  return (
    <div className="relative flex min-h-[280px] flex-col items-start rounded-[16px] border-[0.889px] border-solid border-[#eeeef2] bg-white p-[24px] drop-shadow-[0px_1px_1px_rgba(30,36,48,0.04)]">
      <div className="flex h-[151.222px] w-full items-center justify-center px-[8px]">
        <p
          className="text-center text-[32px] font-medium leading-[33px] text-[#1f2430] [word-break:break-word]"
          dir="auto"
        >
          {text}
        </p>
      </div>
      <div className="flex w-full items-center justify-between pt-[8px]">
        <div className="flex items-center gap-[8px]">
          <p className="text-[16px] font-normal leading-[22.5px] text-[#1f2430]" dir="auto">
            השלמות {completions}
          </p>
          <div className="relative size-[16px] shrink-0">
            <img alt="" className="absolute inset-0 block size-full max-w-none" src={imgPersonIcon} />
          </div>
        </div>
        <button
          type="button"
          className="flex items-center justify-center rounded-[16px] bg-[#0f3040] px-[32px] py-[16px] drop-shadow-[0px_8px_10px_rgba(102,51,231,0.28)] transition-colors hover:bg-[#0c2733]"
        >
          <span className="text-center text-[19px] font-medium leading-[28.5px] text-white" dir="auto">
            השלם
          </span>
        </button>
      </div>
      <div className="absolute left-[398.56px] top-[-31.15px] flex size-[130.847px] items-center justify-center">
        <div className="relative size-[65.424px] shrink-0">
          <img alt="" className="absolute inset-0 block size-full max-w-none" src={imgQuoteMark} />
        </div>
      </div>
    </div>
  );
}

function NavItem({
  label,
  icon,
  active = false,
}: {
  label: string;
  icon: string;
  active?: boolean;
}) {
  return (
    <div
      className={
        active
          ? "flex h-[62.778px] w-[275px] items-center justify-end gap-[16px] rounded-[16px] border-[0.889px] border-solid border-[#8fa4e3] bg-[#f6f1fe] px-[40px] py-[16px] drop-shadow-[0px_1px_1px_rgba(93,26,252,0.06)]"
          : "flex h-[45px] w-[275px] items-center justify-end gap-[16px] px-[40px] py-[8px]"
      }
    >
      <p className="text-right text-[19px] font-medium leading-[28.5px] text-[#1f2430]" dir="auto">
        {label}
      </p>
      <div className="flex size-[28px] items-center justify-center">
        <div className="relative size-[24px] shrink-0">
          <img alt="" className="absolute inset-0 block size-full max-w-none" src={icon} />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen w-full bg-[#e5e9fa]" dir="ltr">
      <div className="flex flex-col items-center xl:items-start">
        <div className="flex flex-col items-stretch gap-[40px] p-[32px] xl:flex-row xl:items-start">
          {/* Main content */}
          <div className="flex w-full max-w-[1032px] flex-col items-start gap-[28px]">
            {/* Hero */}
            <div className="flex w-full flex-col items-center justify-center gap-[16px] rounded-[28px] bg-[#f4effc] px-[40px] py-[32px] drop-shadow-[0px_2px_5px_rgba(93,26,252,0.05)] sm:flex-row">
              <div className="h-[204.337px] w-[212px] max-w-[212px] shrink-0 overflow-hidden rounded-full bg-[#e5e9fa]">
                <img alt="איור של אישה כותבת ביומן" className="size-full object-cover" src={imgImage} />
              </div>
              <div className="flex w-full max-w-[536.167px] flex-col items-center justify-center gap-[24px] px-[16px]">
                <div className="flex flex-col items-center gap-[8px] xl:items-end">
                  <p
                    className="text-right text-[54px] leading-[48.3px] text-[#1f2430] [font-family:'Alef',sans-serif] font-bold"
                    dir="auto"
                  >
                    ימשיך כבודו
                  </p>
                  <p className="text-center text-[18px] font-normal leading-[28.5px] text-[#3a3f4b]" dir="auto">
                    שני אנשים. משפט אחד.
                  </p>
                </div>
                <button
                  type="button"
                  className="flex items-center justify-center rounded-[16px] bg-[#0f3040] px-[64px] py-[16px] transition-colors hover:bg-[#0c2733]"
                >
                  <span className="text-center text-[22px] font-medium leading-[28.5px] text-white" dir="auto">
                    התחל משפט
                  </span>
                </button>
              </div>
            </div>

            {/* Sentence grid */}
            <div className="grid w-full grid-cols-1 gap-[24px] md:grid-cols-[504px_504px]">
              {sentences.map((s, i) => (
                <SentenceCard key={i} text={s.text} completions={s.completions} />
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="flex flex-col items-center justify-center gap-[42px] py-[16px]">
            <div className="flex w-full items-center justify-end gap-[16.276px]">
              <div className="relative flex size-[54.255px] flex-col items-center justify-center rounded-[27.127px] border-[1.356px] border-solid border-[#8fa4e3] bg-[#f6f1fe] drop-shadow-[0px_1.356px_1.356px_rgba(93,26,252,0.06)]">
                <div className="relative size-[27.127px] shrink-0">
                  <img alt="התראות" className="absolute inset-0 block size-full max-w-none" src={imgBell} />
                </div>
                <div className="absolute right-[-4.07px] top-[-4.07px] size-[24.415px] rounded-[12.207px] border-[2.713px] border-solid border-[#f8f7fc] bg-[#0f3040]" />
              </div>
              <div className="relative size-[54.255px] shrink-0 overflow-hidden rounded-[27.127px] border-[2.713px] border-solid border-[#8fa4e3]">
                <img alt="תמונת פרופיל" className="size-full object-cover" src={imgProfile} />
              </div>
            </div>
            <div className="flex flex-col items-start gap-[16px]">
              <NavItem label="בית" icon={imgHomeIcon} active />
              <NavItem label="משפטים שהתחלתי" icon={imgPencilIcon} />
              <NavItem label="משפטים שהשלמתי" icon={imgChatIcon} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
