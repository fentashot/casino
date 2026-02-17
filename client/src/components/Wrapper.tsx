import type { ReactNode } from 'react';


type WrapperProps = {
  children: ReactNode;
};

export default function Wrapper({ children }: WrapperProps): JSX.Element {
  return <div className=''>{children}</div>;
}
