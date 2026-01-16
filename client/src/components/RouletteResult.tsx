/**
 * Komponent wyświetlający wynik spinu (numer i kolor)
 * Zawsze jest widoczny, ale animuje się przy zmianie wyniku
 */

type Result = {
  number: number;
  color: 'red' | 'black' | 'green';
};

type Props = {
  result: Result | null;
  showResult: boolean;
};

const COLOR_MAP = {
  red: '#FF013C',
  black: '#1D2224',
  green: '#16A34A',
} as const;

export function RouletteResult({ result, showResult }: Props) {
  return (
    <div className="w-12 h-12 overflow-hidden bg-zinc-700 rounded-md">
      <div
        className={`w-12 h-12 rounded-md text-center flex items-center justify-center font-bold duration-200 transform transition-all ease-in-out ${showResult && result ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-70'
          }`}
      >
        <div
          className="w-full h-full rounded-md text-white flex items-center justify-center text-sm"
          style={{
            backgroundColor: result ? COLOR_MAP[result.color] : '#555',
          }}
        >
          {result?.number ?? '-'}
        </div>
      </div>
    </div>
  );
}
