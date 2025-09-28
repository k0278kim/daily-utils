import {motion} from "framer-motion";

type TextButtonType = {
  text: string;
  onClick?: () => void;
}

const TextButton = ({ text, onClick}: TextButtonType) => {
  return <motion.button className={"w-fit h-full px-5 space-x-2.5 flex items-center justify-center rounded-lg bg-white hover:bg-gray-100 active:bg-gray-200 border-[1px] border-gray-300 font-semibold"}
                        onClick={onClick}
  >
    <p className={"w-fit"}>{text}</p>
  </motion.button>
}

export default TextButton;