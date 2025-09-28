import Image from "next/image";
import {motion} from "framer-motion";

type iconTextButtonType = {
  src: string;
  text: string;
  onClick?: () => void;
}

const IconTextButton = ({src, text, onClick}: iconTextButtonType) => {
  return <motion.button className={"w-fit px-2.5 space-x-2.5 flex items-center justify-center rounded-lg bg-white hover:bg-gray-100 active:bg-gray-200 border-[1px] border-gray-300 font-semibold"}
                        onClick={onClick}
  >
    <div className={"w-4 aspect-square relative"}>
      <Image src={src} alt={""} fill className={"object-cover"} />
    </div>
    <p className={"w-fit"}>{text}</p>
  </motion.button>
}

export default IconTextButton;