import Image from "next/image";
import {motion} from "framer-motion";

type iconButtonType = {
  src: string;
  onClick?: () => void;
}

const IconButton = ({src, onClick}: iconButtonType) => {
  return <motion.button className={"cursor-pointer w-fit aspect-square px-2.5 space-x-2.5 flex items-center justify-center rounded-lg bg-white hover:bg-gray-100 active:bg-gray-200 border-[1px] border-gray-300 text-sm font-semibold"}
                        onClick={onClick}
  >
    <div className={"w-6 aspect-square relative"}>
      <Image src={src} alt={""} fill className={"object-cover"} />
    </div>
  </motion.button>
}

export default IconButton;