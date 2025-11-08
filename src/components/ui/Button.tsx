interface ButtonProps {
    onClick?: () => void;
    children?: React.ReactNode;
    outlined?: boolean;
    className?: string;
}

export default function Button({ onClick, children, outlined, className }: ButtonProps) {
    return (
        <button className={`${className} w-full flex py-3 px-4 border-2 justify-between items-center rounded-full cursor-pointer hover:bg-white  hover:text-black duration-300 mt-3 ${outlined ? "bg-white border-black text-black" : "bg-black text-white"}`} onClick={onClick}>
            {children}
        </button>
    )
}