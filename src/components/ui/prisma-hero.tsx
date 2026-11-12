import { motion, useInView } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { BackgroundVideo } from "@/components/ui/background-video";

function InstagramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}
function YoutubeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
      <path d="m10 15 5-3-5-3z" />
    </svg>
  );
}
function TiktokIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M14 3v10.2a3.8 3.8 0 1 1-3.2-3.75v2.23a1.65 1.65 0 1 0 1.1 1.55V3h2.1c.26 1.93 1.6 3.5 3.4 4.07v2.16A6.5 6.5 0 0 1 14 7.8V3Z" />
    </svg>
  );
}
function DiscordIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M20.3 5.37A16.2 16.2 0 0 0 16.3 4c-.17.31-.37.73-.5 1.06a15 15 0 0 0-4.49 0A10.7 10.7 0 0 0 10.8 4c-1.4.24-2.74.69-4 1.37C4.26 9.14 3.58 12.82 3.92 16.45A16.3 16.3 0 0 0 8.87 19c.4-.55.75-1.13 1.06-1.75-.58-.22-1.14-.5-1.67-.82.14-.1.28-.22.41-.33a11.6 11.6 0 0 0 9.95 0l.41.33c-.53.32-1.09.6-1.67.82.3.62.66 1.2 1.06 1.75a16.2 16.2 0 0 0 4.95-2.55c.4-4.21-.68-7.86-2.07-11.08ZM9.55 14.23c-1 0-1.82-.93-1.82-2.07 0-1.14.8-2.08 1.82-2.08s1.84.94 1.82 2.08c0 1.14-.8 2.07-1.82 2.07Zm6.19 0c-1 0-1.82-.93-1.82-2.07 0-1.14.8-2.08 1.82-2.08s1.84.94 1.82 2.08c0 1.14-.8 2.07-1.82 2.07Z" />
    </svg>
  );
}
function GithubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.18-3.37-1.18-.45-1.15-1.1-1.46-1.1-1.46-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.35 1.09 2.92.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.28.1-2.66 0 0 .84-.27 2.75 1.02A9.6 9.6 0 0 1 12 6.8c.85 0 1.71.12 2.51.34 1.9-1.29 2.74-1.02 2.74-1.02.55 1.38.2 2.41.1 2.66.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.86v2.76c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />
    </svg>
  );
}

/* ---------------- WordsPullUp ---------------- */
interface WordsPullUpProps {
  text: string;
  className?: string;
  showAsterisk?: boolean;
  style?: React.CSSProperties;
}

export const WordsPullUp = ({ text, className = "", showAsterisk = false, style }: WordsPullUpProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  const words = text.split(" ");

  return (
    <div ref={ref} className={`inline-flex flex-wrap ${className}`} style={style}>
      {words.map((word, i) => {
        const isLast = i === words.length - 1;
        return (
          <motion.span
            key={i}
            initial={{ y: 20, opacity: 0 }}
            animate={isInView ? { y: 0, opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="inline-block relative"
            style={{ marginRight: isLast ? 0 : "0.25em" }}
          >
            {word}
            {showAsterisk && isLast && (
              <span className="absolute top-[0.65em] -right-[0.3em] text-[0.31em]">*</span>
            )}
          </motion.span>
        );
      })}
    </div>
  );
};

/* ---------------- WordsPullUpMultiStyle ---------------- */
interface Segment {
  text: string;
  className?: string;
}

interface WordsPullUpMultiStyleProps {
  segments: Segment[];
  className?: string;
  style?: React.CSSProperties;
}

export const WordsPullUpMultiStyle = ({ segments, className = "", style }: WordsPullUpMultiStyleProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });

  const words: { word: string; className?: string }[] = [];
  segments.forEach((seg) => {
    seg.text.split(" ").forEach((w) => {
      if (w) words.push({ word: w, className: seg.className });
    });
  });

  return (
    <div ref={ref} className={`inline-flex flex-wrap justify-center ${className}`} style={style}>
      {words.map((w, i) => (
        <motion.span
          key={i}
          initial={{ y: 20, opacity: 0 }}
          animate={isInView ? { y: 0, opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
          className={`inline-block ${w.className ?? ""}`}
          style={{ marginRight: "0.25em" }}
        >
          {w.word}
        </motion.span>
      ))}
    </div>
  );
};

/* ---------------- Hero ---------------- */
const navItems = [
  { label: "Instagram", href: "https://instagram.com/nuanscape.studio", icon: InstagramIcon },
  { label: "YouTube", href: "https://youtube.com/@nuanscape.studio", icon: YoutubeIcon },
  { label: "TikTok", href: "https://tiktok.com/@nuanscape.studio", icon: TiktokIcon },
  { label: "Discord", href: "https://discord.gg/nuanscape", icon: DiscordIcon },
  { label: "GitHub", href: "https://github.com/nuanscape", icon: GithubIcon },
];

const PrismaHero = () => {
  return (
    <section className="h-dvh w-full">
      <div className="relative h-full w-full overflow-hidden rounded-2xl bg-[#0D0D0D] md:rounded-[2rem]">

        <Link
          to="/"
          aria-label="NUANSCAPE.STUDIO"
          className="absolute left-4 top-4 z-30 sm:left-6 sm:top-5 md:left-8 md:top-6"
        >
          <img
            src="/logo-n-opt.png"
            alt="Nuanscape"
            width={360}
            height={133}
            fetchPriority="high"
            decoding="async"
            className="block h-9 w-auto object-contain sm:h-10 md:h-12"
          />
        </Link>

        {/* Background video */}
        <BackgroundVideo
          className="absolute inset-0 h-full w-full object-cover"
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_170732_8a9ccda6-5cff-4628-b164-059c500a2b41.mp4"
        />

        {/* Noise overlay */}
        <div className="noise-overlay pointer-events-none absolute inset-0 opacity-[0.7] mix-blend-overlay" />

        {/* Gradient overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />

        {/* Navbar */}
        <nav className="absolute left-1/2 top-0 z-20 -translate-x-1/2">
          <div className="flex items-center gap-1 rounded-b-2xl border-x border-b border-white/[0.06] bg-black/95 px-2.5 py-1.5 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.9)] backdrop-blur-sm sm:gap-1.5 sm:px-3 sm:py-2 md:rounded-b-[22px] md:px-4">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                aria-label={item.label}
                title={item.label}
                className="group inline-flex size-9 items-center justify-center rounded-xl text-[#E1E0CC]/72 transition-all duration-200 hover:bg-white/[0.07] hover:text-[#E1E0CC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E1E0CC]/25"
              >
                <item.icon className="size-[18px] shrink-0 transition-transform duration-200 group-hover:scale-[1.04]" />
              </a>
            ))}
          </div>
        </nav>

        {/* Hero content */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-2 sm:px-6 md:px-10">
          <div className="grid grid-cols-12 items-end gap-4">
            
            <div className="col-span-12 lg:col-span-8">
              <h1
                className="flex flex-col items-start font-medium tracking-[-0.07em] text-[18vw] sm:text-[16vw] md:text-[14vw] lg:text-[12vw] xl:text-[11vw] 2xl:text-[11vw]"
                style={{ color: "#E1E0CC" }}
              >
                <span className="block leading-[0.84]">
                  <WordsPullUp text="NUANSCAPE" showAsterisk />
                </span>
                <span className="-mt-[0.03em] block pl-[0.04em] text-[0.28em] leading-[1] tracking-[0.14em] text-[#E1E0CC]/78">STUDIO</span>
              </h1>
            </div>

            <div className="col-span-12 flex flex-col gap-5 pb-6 lg:col-span-4 lg:pb-10">
              
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="text-xs sm:text-sm md:text-base"
                style={{ lineHeight: 1.2, color: "rgba(225, 224, 204, 0.7)" }}
              >
                NUANSCAPE.STUDIO menghadirkan lima antarmuka agentic: Agent Monitor, Seller Center, Content Production, Finance, dan Nuanscape AI — dikendalikan oleh agent khusus untuk setiap domain.
              </motion.p>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="self-start"
              >
                <Link
                  to="/login?next=/app/monitor"
                  className="group inline-flex items-center gap-2 rounded-full bg-[#E1E0CC] py-1 pl-5 pr-1 text-sm font-medium text-black transition-all hover:gap-3 sm:text-base"
                >
                  Buka Agent Monitor
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black transition-transform group-hover:scale-110 sm:h-10 sm:w-10">
                    <ArrowRight className="h-4 w-4" style={{ color: "#E1E0CC" }} />
                  </span>
                </Link>
              </motion.div>

            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export { PrismaHero };
