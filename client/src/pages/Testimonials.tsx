import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";

const testimonials = [
  {
    quote: "What a blast!! Amazing company, great organisation and a fantastic location. Friends made; things learnt; fun had. Result! Here's looking forward to next time!",
    emoji: "🚀",
    color: "from-purple-600/30 to-indigo-600/30",
    border: "border-purple-500/40",
    accent: "#a78bfa",
  },
  {
    quote: "What a great couple of days! It's been amazing to catch up with so many peers and partners, sharing challenges and hearing about inspiring successes. Thank you to the entire TREC team for organising another great event. 🎉🥂",
    emoji: "🥂",
    color: "from-amber-600/20 to-yellow-600/20",
    border: "border-amber-500/40",
    accent: "#d4af37",
  },
  {
    quote: "What a fantastic 2 days, felt really different. Hotel, venue, food, gala evening, extra activities, vendor meetings, great debates and discussions. The list goes on. Lovely seeing old faces and meeting new ones too.",
    emoji: "✨",
    color: "from-pink-600/25 to-rose-600/25",
    border: "border-pink-500/40",
    accent: "#f472b6",
  },
  {
    quote: "I want to thank everyone who attended the RLX event, it has genuinely been a privilege to have been part of. I've been blown away by this experience for so many reasons — the level of effort and planning has clearly been taken to another level and the memories I will take away are ones I will not forget any time soon.",
    emoji: "💫",
    color: "from-cyan-600/25 to-teal-600/25",
    border: "border-cyan-500/40",
    accent: "#22d3ee",
  },
  {
    quote: "The connections made here have been incredibly valuable, not only forming new ones but strengthening those that had barely gone beyond a simple introduction. This event delivered far more than I expected.",
    emoji: "🤝",
    color: "from-violet-600/30 to-purple-600/30",
    border: "border-violet-500/40",
    accent: "#8b5cf6",
  },
  {
    quote: "The workshops also deserve a mention, they challenged my thinking in quite a few ways that has stayed with me for reflection on my journey home. I suspect will continue to do so for some time once I return to normality and BAU tomorrow, albeit with a new lens.",
    emoji: "🧠",
    color: "from-emerald-600/25 to-green-600/25",
    border: "border-emerald-500/40",
    accent: "#34d399",
  },
  {
    quote: "The wellness sessions also deserve a shoutout — the whiskey tasting was exceptional and perhaps unsurprisingly was well attended. As for Pilates, whilst I didn't quite follow through on my confident intentions to take part, I can at least confirm I woke up for it which I'll take as a small win. 😂",
    emoji: "🥃",
    color: "from-orange-600/25 to-amber-600/25",
    border: "border-orange-500/40",
    accent: "#fb923c",
  },
  {
    quote: "You created an environment that made it easier to step outside my comfort zone — as someone who is naturally introverted, I usually keep my guard up but during this event, I gradually found myself able to relax, connect and properly engage with people I would not normally approach.",
    emoji: "🌟",
    color: "from-blue-600/25 to-indigo-600/25",
    border: "border-blue-500/40",
    accent: "#60a5fa",
  },
  {
    quote: "I feel like I have actually left having levelled up professionally and personally, a rarity for me.",
    emoji: "⬆️",
    color: "from-purple-600/30 to-pink-600/30",
    border: "border-purple-500/40",
    accent: "#c084fc",
  },
  {
    quote: "A massive thanks to you all for the warm welcome — genuinely beyond appreciative. RL, you absolutely smashed it… amazing content, great bike ride (and definitely some dodgy gears that slowed me down on the hill 😅), and Pilates at dawn (still recovering 😂).",
    emoji: "🚴",
    color: "from-teal-600/25 to-cyan-600/25",
    border: "border-teal-500/40",
    accent: "#2dd4bf",
  },
  {
    quote: "Such a good vibe all round, plenty of laughs, and The Grove — seriously impressive venue. Didn't want to leave! Thanks again for the invite — definitely one I won't forget. See you at the next one 🙌",
    emoji: "🏡",
    color: "from-rose-600/25 to-pink-600/25",
    border: "border-rose-500/40",
    accent: "#fb7185",
  },
  {
    quote: "Thank you for such a wonderful event. Really enjoyed meeting so many of you and having great conversations for the last couple of days. A special thanks for such a lovely panel conversation.",
    emoji: "🎤",
    color: "from-indigo-600/25 to-blue-600/25",
    border: "border-indigo-500/40",
    accent: "#818cf8",
  },
  {
    quote: "Definitely the best event I've ever been to. Somehow you have a knack of bringing together the best venues, content, format and most of all the people to create something unique and magic. Loved it thank you!! #myarseisstillsore (from the bike ride!) 🤣",
    emoji: "🏆",
    color: "from-yellow-600/25 to-amber-600/25",
    border: "border-yellow-500/40",
    accent: "#fbbf24",
  },
  {
    quote: "Fantastic event, thank you to everyone who was involved in organising. Looking forward to the next one. We really do have some super talented people in this community 🥂",
    emoji: "🌍",
    color: "from-green-600/25 to-emerald-600/25",
    border: "border-green-500/40",
    accent: "#4ade80",
  },
  {
    quote: "Thank you for the last few days, that was an amazing experience! Will be so happy to meet you again soon. Special thanks to the organizers, you are literally THE BEST ❤️",
    emoji: "❤️",
    color: "from-red-600/25 to-rose-600/25",
    border: "border-red-500/40",
    accent: "#f87171",
  },
  {
    quote: "Thank you all for the amazing experience ✨👏🎉 Special thanks for such a spectacular hosting and hospitality 😁✨",
    emoji: "🎊",
    color: "from-fuchsia-600/25 to-purple-600/25",
    border: "border-fuchsia-500/40",
    accent: "#e879f9",
  },
  {
    quote: "Really good, relevant content and some useful vendor meetings, thanks to all the team for trying something new and a really great couple of days, such a treat 💗🙌",
    emoji: "💡",
    color: "from-sky-600/25 to-blue-600/25",
    border: "border-sky-500/40",
    accent: "#38bdf8",
  },
  {
    quote: "It was a fantastic few days so thank you so much for organising. Great topics and always so good connecting with others…",
    emoji: "💬",
    color: "from-violet-600/25 to-indigo-600/25",
    border: "border-violet-500/40",
    accent: "#a78bfa",
  },
  {
    quote: "Thank you to the entire RL team for pulling together the two days. And to everyone who hosted the discussions. They were very engaging and fun. Looking forward to meeting everyone again at RecFest in a few months.",
    emoji: "🎯",
    color: "from-lime-600/25 to-green-600/25",
    border: "border-lime-500/40",
    accent: "#a3e635",
  },
  {
    quote: "Just loved it, very well organised and planned, excellent format as well, giving time to attendees on first day just to network and relax was an excellent move, amazing energy across and superb selection of vendors as well, learned more and got to know some amazing people and technology coming our way.",
    emoji: "⚡",
    color: "from-amber-600/25 to-orange-600/25",
    border: "border-amber-500/40",
    accent: "#f59e0b",
  },
  {
    quote: "Thanks so much to all for a great couple of days — especially the RL team for creating such a great experience! 👏",
    emoji: "👏",
    color: "from-pink-600/25 to-fuchsia-600/25",
    border: "border-pink-500/40",
    accent: "#f472b6",
  },
  {
    quote: "Thanks so much all for a great few days especially RL team for all the hard work put in for the organising!!",
    emoji: "🙏",
    color: "from-teal-600/25 to-emerald-600/25",
    border: "border-teal-500/40",
    accent: "#2dd4bf",
  },
  {
    quote: "Thank you for a fantastic 2 days! Organisation was superb and it was great to meet you all. Look forward to seeing you all again soon.",
    emoji: "🌈",
    color: "from-cyan-600/25 to-sky-600/25",
    border: "border-cyan-500/40",
    accent: "#22d3ee",
  },
];

// Floating particle component
function Particle({ x, y, size, color, duration }: { x: number; y: number; size: number; color: string; duration: number }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{ left: `${x}%`, top: `${y}%`, width: size, height: size, background: color, opacity: 0.15 }}
      animate={{ y: [-20, 20, -20], x: [-10, 10, -10], opacity: [0.1, 0.25, 0.1] }}
      transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

// Individual testimonial card
function TestimonialCard({ testimonial, index }: { testimonial: typeof testimonials[0]; index: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60, scale: 0.9 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.6, delay: (index % 3) * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className={`relative rounded-2xl border bg-gradient-to-br ${testimonial.color} ${testimonial.border} backdrop-blur-sm p-6 cursor-default overflow-hidden group`}
      style={{ boxShadow: hovered ? `0 0 40px ${testimonial.accent}30` : "none", transition: "box-shadow 0.3s ease" }}
      whileHover={{ y: -6, scale: 1.02 }}
    >
      {/* Glow on hover */}
      <motion.div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: `radial-gradient(circle at 50% 0%, ${testimonial.accent}15, transparent 70%)` }}
      />

      {/* Quote mark */}
      <div className="absolute top-3 right-4 text-5xl leading-none opacity-10 font-serif select-none" style={{ color: testimonial.accent }}>
        "
      </div>

      {/* Emoji badge */}
      <motion.div
        className="inline-flex items-center justify-center w-10 h-10 rounded-xl mb-4 text-xl"
        style={{ background: `${testimonial.accent}20`, border: `1px solid ${testimonial.accent}40` }}
        animate={hovered ? { rotate: [0, -10, 10, 0], scale: [1, 1.2, 1] } : {}}
        transition={{ duration: 0.5 }}
      >
        {testimonial.emoji}
      </motion.div>

      {/* Quote text */}
      <p className="text-slate-200 text-sm leading-relaxed font-light relative z-10" style={{ fontFamily: "'Playfair Display', serif" }}>
        "{testimonial.quote}"
      </p>

      {/* Bottom accent line */}
      <motion.div
        className="absolute bottom-0 left-0 h-0.5 rounded-full"
        style={{ background: `linear-gradient(to right, transparent, ${testimonial.accent}, transparent)` }}
        initial={{ width: "0%" }}
        animate={isInView ? { width: "100%" } : { width: "0%" }}
        transition={{ duration: 1, delay: 0.3 + (index % 3) * 0.1 }}
      />
    </motion.div>
  );
}

// Marquee strip
function MarqueeStrip({ words, direction = 1 }: { words: string[]; direction?: number }) {
  return (
    <div className="overflow-hidden py-2 my-2">
      <motion.div
        className="flex gap-6 whitespace-nowrap"
        animate={{ x: direction > 0 ? ["0%", "-50%"] : ["-50%", "0%"] }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      >
        {[...words, ...words].map((word, i) => (
          <span key={i} className="text-xs font-semibold tracking-widest uppercase opacity-30 text-purple-300 shrink-0">
            {word} ✦
          </span>
        ))}
      </motion.div>
    </div>
  );
}

// Counter animation
function AnimatedCounter({ target, label }: { target: number; label: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    const duration = 1500;
    const start = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress >= 1) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [isInView, target]);

  return (
    <div ref={ref} className="text-center">
      <div className="text-4xl font-bold text-white mb-1" style={{ fontFamily: "'Montserrat', sans-serif" }}>
        {count}+
      </div>
      <div className="text-xs text-slate-400 uppercase tracking-widest">{label}</div>
    </div>
  );
}

export default function Testimonials() {
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [visibleCount, setVisibleCount] = useState(9);

  const particles = Array.from({ length: 18 }, (_, i) => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 6 + 3,
    color: ["#7B4B94", "#d4af37", "#a78bfa", "#60a5fa", "#f472b6"][i % 5],
    duration: Math.random() * 6 + 4,
  }));

  const marqueeWords = ["Community", "Connection", "Innovation", "Leadership", "Collaboration", "Inspiration", "Growth", "Excellence"];

  const filtered = testimonials.slice(0, visibleCount);

  return (
    <div
      className="min-h-screen relative overflow-x-hidden"
      style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #2C3E5A 50%, #1a1a2e 100%)", fontFamily: "'Montserrat', sans-serif" }}
    >
      {/* Floating particles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {particles.map((p, i) => (
          <Particle key={i} {...p} />
        ))}
      </div>

      {/* Noise texture overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
        backgroundRepeat: "repeat",
        backgroundSize: "128px 128px",
      }} />

      {/* Hero section */}
      <div className="relative pt-20 pb-12 px-6 text-center">
        {/* Back link */}
        <motion.a
          href="/"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="absolute top-6 left-6 flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors"
        >
          ← Back
        </motion.a>

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/40 bg-purple-500/10 text-purple-300 text-xs font-semibold tracking-widest uppercase mb-6"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
          RLX Summit · March 2026
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-5xl md:text-7xl font-black text-white mb-4 leading-none tracking-tight"
          style={{ fontFamily: "'Montserrat', sans-serif" }}
        >
          The{" "}
          <span
            className="relative inline-block"
            style={{ WebkitTextStroke: "2px #7B4B94", color: "transparent" }}
          >
            Voices
          </span>
          <br />
          <span style={{ background: "linear-gradient(90deg, #d4af37, #a78bfa, #d4af37)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundSize: "200% 100%", animation: "shimmer 3s linear infinite" }}>
            of RLX
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="text-slate-400 text-lg max-w-xl mx-auto leading-relaxed"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Unfiltered reactions from the people who were there. No names. No titles. Just the truth.
        </motion.p>

        {/* Marquee */}
        <div className="mt-10 max-w-4xl mx-auto">
          <MarqueeStrip words={marqueeWords} direction={1} />
          <MarqueeStrip words={[...marqueeWords].reverse()} direction={-1} />
        </div>
      </div>

      {/* Stats bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="max-w-3xl mx-auto px-6 mb-16"
      >
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm grid grid-cols-3 divide-x divide-white/10 py-6">
          <AnimatedCounter target={23} label="Testimonials" />
          <AnimatedCounter target={38} label="Attendees" />
          <AnimatedCounter target={2} label="Days of Magic" />
        </div>
      </motion.div>

      {/* Testimonials masonry grid */}
      <div className="max-w-6xl mx-auto px-6 pb-12">
        <div className="columns-1 md:columns-2 lg:columns-3 gap-5 space-y-5">
          {filtered.map((t, i) => (
            <div key={i} className="break-inside-avoid mb-5">
              <TestimonialCard testimonial={t} index={i} />
            </div>
          ))}
        </div>

        {/* Load more */}
        {visibleCount < testimonials.length && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center mt-12"
          >
            <button
              onClick={() => setVisibleCount(testimonials.length)}
              className="px-8 py-3 rounded-full border border-purple-500/50 text-purple-300 text-sm font-semibold hover:bg-purple-500/20 transition-all hover:scale-105 active:scale-95"
            >
              Show all {testimonials.length} voices ✦
            </button>
          </motion.div>
        )}
      </div>

      {/* Bottom CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="text-center py-20 px-6 relative"
      >
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at center, #7B4B9420 0%, transparent 70%)" }} />
        <p className="text-slate-500 text-xs uppercase tracking-widest mb-3">Next Summit</p>
        <h2 className="text-3xl md:text-4xl font-black text-white mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
          Will you be there?
        </h2>
        <p className="text-slate-400 text-sm" style={{ fontFamily: "'Playfair Display', serif" }}>
          The Resourcing Leaders Exchange — where the best in TA come together.
        </p>
      </motion.div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
      `}</style>
    </div>
  );
}
