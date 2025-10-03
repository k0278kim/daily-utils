import Image from "next/image";
import {motion} from "framer-motion";

type iconTextButtonType = {
  src: string;
  text: string;
  onClick?: () => void;
  darkmode?: boolean;
}

const IconTextButton = ({src, text, onClick, darkmode}: iconTextButtonType) => {
  return <motion.button className={`cursor-pointer w-fit min-h-10 px-2.5 space-x-2.5 flex items-center justify-center rounded-lg font-semibold border-[1px] 
    ${!darkmode
      ? "bg-white hover:bg-gray-100 active:bg-gray-200 border-gray-300"
      : "bg-gray-800 hover:bg-gray-700 active:bg-gray-600 border-gray-700"
    }`}
                        onClick={onClick}
  >
    <div className={"w-4 aspect-square relative"}>
      <Image src={src} alt={""} fill className={"object-cover"} />
    </div>
    <p className={"w-fit"}>{text}</p>
  </motion.button>
}

export default IconTextButton;