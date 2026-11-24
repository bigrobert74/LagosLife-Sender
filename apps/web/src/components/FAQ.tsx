import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

interface FAQProps {
  showAllByDefault?: boolean;
}

export const FAQ: React.FC<FAQProps> = ({ showAllByDefault = false }) => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const [showAll, setShowAll] = useState<boolean>(showAllByDefault);

  const allFaqs = [
    {
      q: 'How do I buy Lagos Life money?',
      a: 'Choose your desired currency package, enter your Lagos Life character username, review your order details, and proceed to the bank transfer page.',
    },
    {
      q: 'How do I pay?',
      a: 'Payment is made through direct manual bank transfer from your Nigerian bank app (such as OPay, PalmPay, Kuda, GTBank, Zenith, Access, etc.) to our configured business account.',
    },
    {
      q: 'How do I copy the account number?',
      a: 'On the payment page, tap the COPY ACCOUNT NUMBER button. The exact account number is automatically copied to your device clipboard so you can paste it directly into your banking app.',
    },
    {
      q: 'How long does payment verification take?',
      a: 'An administrator reviews your transfer as soon as you submit payment. Once incoming funds reflect on our official bank statement, the order is verified and dispatched in-game.',
    },
    {
      q: 'How do I receive my money in-game?',
      a: 'Money is transferred directly from our authenticated owner character to your Lagos Life username via in-game transfer. Make sure your in-game phone setting is set to allow incoming transfers.',
    },
    {
      q: 'How do I track my order?',
      a: 'Click "Track Order" in the top navigation or enter your Order Number (e.g. LL-477526) to see real-time progress from payment review to delivery completion.',
    },
    {
      q: 'What happens if I enter the wrong username?',
      a: 'If you notice an error in your username before delivery, contact customer support immediately on WhatsApp with your Order Number so our administrator can update the recipient character.',
    },
    {
      q: 'What should I do if my order is delayed?',
      a: 'If your bank transfer has left your account but has not yet been verified, click the WhatsApp support button with your Order Number. We will check the statement and assist you.',
    },
    {
      q: 'How do I contact support?',
      a: 'You can tap the Support link in the header or footer to reach us via WhatsApp or email. Include your Order Number for the fastest response.',
    },
  ];

  const displayedFaqs = showAll ? allFaqs : allFaqs.slice(0, 4);

  return (
    <section id="faq-section" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 border-t border-slate-800/80">
      <div className="text-center mb-10">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Frequently Asked Questions
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Short, direct answers to common questions about buying Lagos Life money.
        </p>
      </div>

      <div className="space-y-3">
        {displayedFaqs.map((faq, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div
              key={idx}
              className="rounded-xl bg-slate-900/60 border border-slate-800 overflow-hidden transition"
            >
              <button
                type="button"
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                className="w-full p-4 sm:p-5 flex justify-between items-center text-left"
              >
                <span className="text-sm font-semibold text-white">{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ml-4 ${
                    isOpen ? 'rotate-180 text-emerald-400' : ''
                  }`}
                />
              </button>
              {isOpen && (
                <div className="px-4 sm:px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-300 border-t border-slate-800/50 leading-relaxed font-sans">
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!showAll && (
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:underline"
          >
            View all frequently asked questions →
          </button>
        </div>
      )}
    </section>
  );
};
