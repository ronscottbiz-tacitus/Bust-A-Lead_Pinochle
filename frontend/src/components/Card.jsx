import { SUIT_BY_KEY, CARD_BACK_IMG } from '../game/constants';

const SIZES = {
  xs: 'w-7 h-10 lg:w-10 lg:h-14 text-[9px] rounded',
  sm: 'w-9 h-[52px] text-[10px] rounded-md',
  md: 'w-[52px] h-[74px] text-sm rounded-lg',
  lg: 'w-[64px] h-[96px] lg:w-20 lg:h-32 text-base rounded-xl',
};

export const Card = ({
  card,
  faceDown = false,
  size = 'md',
  selected = false,
  legal = false,
  dim = false,
  onClick,
  style,
  testid,
  className = '',
}) => {
  if (faceDown || !card) {
    return (
      <div
        style={{ ...style, backgroundImage: `url(${CARD_BACK_IMG})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        data-testid={testid}
        className={`${SIZES[size]} shrink-0 border-2 border-slate-800 shadow-lg overflow-hidden ${className}`}
      />
    );
  }
  const suit = SUIT_BY_KEY[card.suit];
  return (
    <button
      type="button"
      style={style}
      data-testid={testid}
      onClick={onClick}
      disabled={!onClick}
      className={`${SIZES[size]} shrink-0 relative bg-gradient-to-b from-white to-slate-100 border-2 shadow-lg flex flex-col justify-between p-1 card-lift select-none
        ${suit.text}
        ${selected ? 'ring-2 ring-fuchsia-400 -translate-y-3 border-fuchsia-400 shadow-[0_0_18px_rgba(255,0,122,0.6)]' : 'border-slate-800'}
        ${legal ? 'ring-2 ring-cyan-400 shadow-[0_0_16px_rgba(0,240,255,0.65)] cursor-pointer hover:-translate-y-4 hover:scale-105' : ''}
        ${dim ? 'opacity-40 grayscale cursor-not-allowed' : ''}
        ${className}`}
    >
      <div className="flex items-center gap-0.5 font-bold leading-none">
        <span>{card.rank}</span>
        <span>{suit.symbol}</span>
      </div>
      <div className="text-center text-xl sm:text-2xl font-black leading-none">{suit.symbol}</div>
      <div className="flex items-center gap-0.5 font-bold leading-none self-end rotate-180">
        <span>{card.rank}</span>
        <span>{suit.symbol}</span>
      </div>
    </button>
  );
};
