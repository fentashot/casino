import type { ReactNode } from "react";

type WrapperProps = {
	children: ReactNode;
	className?: string;
};

export default function Wrapper({
	children,
	className = "",
}: WrapperProps): JSX.Element {
	return <div className={className}>{children}</div>;
}
