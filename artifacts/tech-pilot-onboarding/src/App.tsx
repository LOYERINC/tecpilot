import { useEffect, useRef, useState, type FormEvent, type ReactNode, type RefObject } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowSquareOut,
  BookOpen,
  CaretRight,
  ChatCircle,
  ChartBar,
  Check,
  Code,
  Database,
  Phone,
  StackSimple,
  ShieldCheck,
  User,
} from '@phosphor-icons/react';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';

// Replace this one placeholder with the supplied WhatsApp invite URL.
const WHATSAPP_INVITE_URL = 'https://chat.whatsapp.com/REPLACE_WITH_INVITE';

const tracks = [
  {
    id: 'data-analysis',
    label: 'Data Analysis',
    description: 'Turn raw information into clear decisions.',
    icon: ChartBar,
  },
  {
    id: 'frontend',
    label: 'Web Development (Frontend)',
    description: 'Build the interfaces people use every day.',
    icon: Code,
  },
  {
    id: 'backend',
    label: 'Web Development (Backend)',
    description: 'Create the systems that power great products.',
    icon: StackSimple,
  },
] as const;

type TrackId = (typeof tracks)[number]['id'];
type Step = 0 | 1 | 2 | 3;

function OpenBookMark({ size = 42 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="relative inline-flex shrink-0 items-center justify-center rounded-[13px] bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]"
      style={{ width: size, height: size }}
    >
      <BookOpen size={size * 0.62} weight="fill" />
    </span>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3" data-testid="brand-tech-pilot">
      <OpenBookMark size={44} />
      <div>
        <p className="font-display text-[15px] font-bold leading-none tracking-[-0.02em] text-[hsl(var(--primary))]">
          Tech Pilot
        </p>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
          Classes
        </p>
      </div>
    </div>
  );
}

function Progress({ step }: { step: Step }) {
  const labels = ['Welcome', 'Track', 'Details', 'Access'];
  return (
    <div className="w-full max-w-[520px]" aria-label={`Step ${step + 1} of 4`}>
      <div className="mb-3 flex justify-between text-[10px] font-bold uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
        <span data-testid="text-progress-step">Step {step + 1} of 4</span>
        <span className="text-[hsl(var(--primary))]">{labels[step]}</span>
      </div>
      <div className="grid grid-cols-4 gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={4} aria-valuenow={step + 1}>
        {labels.map((label, index) => (
          <div key={label} className="space-y-1.5">
            <div
              className={`h-1.5 rounded-full ${index <= step ? 'bg-[hsl(var(--secondary))]' : 'bg-[hsl(var(--border))]'}`}
              aria-hidden="true"
            />
            <span className={`hidden text-[10px] font-semibold sm:block ${index === step ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))]'}`}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScreenHeading({
  eyebrow,
  title,
  children,
  headingRef,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
  headingRef?: RefObject<HTMLHeadingElement | null>;
}) {
  return (
    <div className="mb-8">
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[hsl(var(--secondary))]">{eyebrow}</p>
      <h1 ref={headingRef} tabIndex={-1} className="focus:outline-none font-display max-w-[570px] text-3xl font-bold leading-[1.08] tracking-[-0.04em] text-[hsl(var(--primary))] sm:text-[42px]">
        {title}
      </h1>
      {children}
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  autoComplete,
  icon: Icon,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  autoComplete?: string;
  icon: PhosphorIcon;
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-bold text-[hsl(var(--primary))]">
        {label}
      </label>
      <div className="relative">
        <Icon aria-hidden="true" size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
        <input
          id={id}
          data-testid={`input-${id}`}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`input-field focus-ring h-14 w-full rounded-2xl border bg-[hsl(var(--card))] pl-12 pr-4 text-base font-medium text-[hsl(var(--primary))] placeholder:text-[hsl(var(--muted-foreground))] ${error ? 'border-[hsl(var(--secondary))]' : 'border-[hsl(var(--border))]'}`}
        />
      </div>
      {error ? (
        <p id={`${id}-error`} data-testid={`error-${id}`} className="text-xs font-semibold text-[hsl(var(--secondary))]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function App() {
  const [step, setStep] = useState<Step>(0);
  const [selectedTrack, setSelectedTrack] = useState<TrackId | null>(null);
  const [fullName, setFullName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [errors, setErrors] = useState<{ track?: string; fullName?: string; whatsapp?: string }>({});
  const headingRef = useRef<HTMLHeadingElement>(null);

  const selectedTrackLabel = tracks.find((track) => track.id === selectedTrack)?.label;

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  const goBack = () => {
    if (step > 0) {
      setErrors({});
      setStep((current) => (current - 1) as Step);
    }
  };

  const handleTrackNext = () => {
    if (!selectedTrack) {
      setErrors({ track: 'Choose one track to continue.' });
      return;
    }
    setErrors({});
    setStep(2);
  };

  const handleContactSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: typeof errors = {};
    if (fullName.trim().length < 2) nextErrors.fullName = 'Enter your full name.';
    const digits = whatsapp.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 15) nextErrors.whatsapp = 'Enter a valid WhatsApp number.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) setStep(3);
  };

  return (
    <main className="pilot-app flex min-h-[100dvh] flex-col">
      <header className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-10 sm:py-7">
        <Brand />
        {step > 0 && step < 3 ? (
          <button
            type="button"
            onClick={goBack}
            data-testid="button-back-top"
            className="back-button focus-ring inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold text-[hsl(var(--primary))] hover:bg-[hsl(var(--muted))]"
          >
            <ArrowLeft size={15} aria-hidden="true" />
            Back
          </button>
        ) : null}
      </header>

      <div className="relative z-10 mx-auto flex w-full max-w-[1180px] flex-1 flex-col px-5 pb-8 sm:px-10 lg:flex-row lg:items-center lg:gap-24 lg:pb-16">
        <aside className="hidden w-[285px] shrink-0 lg:block">
          <div className="relative pl-6">
            <div className="absolute bottom-0 left-0 top-0 w-1 rounded-full bg-[hsl(var(--secondary))]" />
            <p className="font-display text-[18px] font-bold leading-tight text-[hsl(var(--primary))]">
              Learn something<br />that moves you.
            </p>
            <p className="mt-4 max-w-[220px] text-sm leading-6 text-[hsl(var(--muted-foreground))]">
              Practical classes, patient guidance, and a community that wants you to win.
            </p>
            <div className="mt-16 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
              <ShieldCheck size={17} className="text-[hsl(var(--secondary))]" aria-hidden="true" />
              Built for beginners
            </div>
          </div>
        </aside>

        <section className="flex w-full flex-1 flex-col justify-center">
          <div className="mb-10 flex justify-center lg:justify-start">
            <Progress step={step} />
          </div>

          <div key={step} className="step-panel max-w-[610px]">
            {step === 0 ? (
              <div>
                <ScreenHeading headingRef={headingRef} eyebrow="A better place to begin" title="Tech Pilot Classes — Learn tech skills fast and affordably">
                  <p className="mt-5 max-w-[500px] text-base leading-7 text-[hsl(var(--muted-foreground))] sm:text-lg">
                    Start with the skills that open doors. Learn at a pace that respects your time, your budget, and your ambition.
                  </p>
                </ScreenHeading>
                <div className="mb-9 flex max-w-[510px] items-start gap-3 rounded-2xl border border-[hsl(37_94%_67%_/_0.6)] bg-[hsl(37_94%_67%_/_0.2)] p-4 text-sm font-semibold leading-6 text-[hsl(var(--primary))]">
                  <div className="mt-0.5 rounded-full bg-[hsl(var(--accent))] p-1.5 text-[hsl(var(--primary))]">
                    <Check size={15} strokeWidth={3} aria-hidden="true" />
                  </div>
                  <span>₦1,000 to join for October–November, regular price ₦10,000 after.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  data-testid="button-get-started"
                  className="action-button focus-ring inline-flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[hsl(var(--secondary))] px-6 text-base font-bold text-[hsl(var(--secondary-foreground))] shadow-[0_12px_22px_hsl(353_78%_56%_/_0.2)] sm:w-auto sm:min-w-[190px]"
                >
                  Get Started
                  <ArrowRight size={18} aria-hidden="true" />
                </button>
                <p className="mt-5 text-xs font-medium text-[hsl(var(--muted-foreground))]">Four quick steps. No pressure, no complicated forms.</p>
              </div>
            ) : null}

            {step === 1 ? (
              <div>
                <ScreenHeading headingRef={headingRef} eyebrow="Step 2 / Your direction" title="What do you want to learn?">
                  <p className="mt-4 text-base text-[hsl(var(--muted-foreground))]">Pick one track. You can focus on the work that feels most useful right now.</p>
                </ScreenHeading>
                <div className="space-y-3" role="radiogroup" aria-label="Choose a learning track">
                  {tracks.map(({ id, label, description, icon: Icon }) => {
                    const isSelected = selectedTrack === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        data-testid={`option-track-${id}`}
                        onClick={() => {
                          setSelectedTrack(id);
                          setErrors({});
                        }}
                        className={`option-card focus-ring flex w-full items-center gap-4 rounded-2xl border p-4 text-left ${isSelected ? 'border-[hsl(var(--secondary))] bg-[hsl(353_78%_56%_/_0.06)]' : 'border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[hsl(var(--secondary))]'}`}
                      >
                        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${isSelected ? 'bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]' : 'bg-[hsl(var(--muted))] text-[hsl(var(--primary))]'}`}>
                          <Icon size={21} aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-bold text-[hsl(var(--primary))] sm:text-base">{label}</span>
                          <span className="mt-1 block text-xs leading-5 text-[hsl(var(--muted-foreground))]">{description}</span>
                        </span>
                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${isSelected ? 'border-[hsl(var(--secondary))] bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]' : 'border-[hsl(var(--border))]'}`}>
                          {isSelected ? <Check size={14} strokeWidth={3} aria-hidden="true" /> : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {errors.track ? <p data-testid="error-track" className="mt-3 text-xs font-semibold text-[hsl(var(--secondary))]">{errors.track}</p> : null}
                <button
                  type="button"
                  onClick={handleTrackNext}
                  data-testid="button-next-track"
                  className="action-button focus-ring mt-8 inline-flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[hsl(var(--primary))] px-6 text-base font-bold text-[hsl(var(--primary-foreground))] sm:w-auto sm:min-w-[170px]"
                >
                  Next
                  <CaretRight size={18} aria-hidden="true" />
                </button>
              </div>
            ) : null}

            {step === 2 ? (
              <div>
                <ScreenHeading headingRef={headingRef} eyebrow="Step 3 / Your details" title="A few details, then you're ready.">
                  <p className="mt-4 max-w-[470px] text-base leading-7 text-[hsl(var(--muted-foreground))]">
                    We’ll use these to make sure you get the right class updates on WhatsApp.
                  </p>
                </ScreenHeading>
                <form onSubmit={handleContactSubmit} noValidate className="space-y-5">
                  <Field id="full-name" label="Full Name" value={fullName} onChange={setFullName} placeholder="e.g. Ada Okafor" autoComplete="name" icon={User} error={errors.fullName} />
                  <Field id="whatsapp-number" label="WhatsApp Number" value={whatsapp} onChange={setWhatsapp} placeholder="e.g. +234 801 234 5678" type="tel" autoComplete="tel" icon={Phone} error={errors.whatsapp} />
                  <button
                    type="submit"
                    data-testid="button-get-access"
                    className="action-button focus-ring mt-3 inline-flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[hsl(var(--secondary))] px-6 text-base font-bold text-[hsl(var(--secondary-foreground))] shadow-[0_12px_22px_hsl(353_78%_56%_/_0.2)] sm:w-auto sm:min-w-[190px]"
                  >
                    Get Access
                    <ArrowRight size={18} aria-hidden="true" />
                  </button>
                </form>
              </div>
            ) : null}

            {step === 3 ? (
              <div>
                <div className="mb-7 flex h-16 w-16 items-center justify-center rounded-[20px] bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]">
                  <ChatCircle size={30} aria-hidden="true" />
                </div>
                <ScreenHeading headingRef={headingRef} eyebrow="Step 4 / You're registered" title="You're in!">
                  <p className="mt-5 max-w-[540px] text-lg leading-8 text-[hsl(var(--muted-foreground))]">
                    Join the WhatsApp group for <strong className="font-bold text-[hsl(var(--primary))]">{selectedTrackLabel}</strong> to get started.
                  </p>
                </ScreenHeading>
                <a
                  href={WHATSAPP_INVITE_URL}
                  target="_blank"
                  rel="noreferrer"
                  data-testid="link-join-whatsapp-group"
                  className="action-button focus-ring inline-flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[hsl(var(--secondary))] px-6 text-base font-bold text-[hsl(var(--secondary-foreground))] shadow-[0_12px_22px_hsl(353_78%_56%_/_0.2)] sm:w-auto sm:min-w-[245px]"
                >
                  Join WhatsApp Group
                  <ArrowSquareOut size={17} aria-hidden="true" />
                </a>
                <div className="mt-8 flex max-w-[500px] items-start gap-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
                  <Database size={18} className="mt-0.5 shrink-0 text-[hsl(var(--secondary))]" aria-hidden="true" />
                  <p className="text-xs font-medium leading-5 text-[hsl(var(--muted-foreground))]">
                    Your class group is where you’ll find the welcome note, schedule, and first steps.
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <footer className="relative z-10 px-5 pb-5 sm:px-10 sm:pb-7">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4 border-t border-[hsl(var(--border))] pt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
          <span>October — November cohort</span>
          <span className="hidden sm:inline">Learn. Build. Move forward.</span>
        </div>
      </footer>
    </main>
  );
}

export default App;
