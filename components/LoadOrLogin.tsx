import {motion} from "framer-motion";
import CircularLoader from "@/components/CircularLoader";
import TextButton from "@/components/TextButton";
import {signIn} from "next-auth/react";
import React, {useEffect} from "react";

type loadOrLoginType = {
  loadOverflow: boolean;
  setLoadOverflow: (loadOverflow: boolean) => void;
}

const LoadOrLogin = ({ loadOverflow, setLoadOverflow }: loadOrLoginType) => {
  return <div className="flex flex-col w-full h-full items-center justify-center relative space-y-10">
    <motion.div className={"w-10 aspect-square"} layoutId={"circular_"}>
      <CircularLoader />
    </motion.div>
    {
      loadOverflow && <motion.div
        initial={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ duration: 0.5 }}
        className={"flex flex-col space-y-5 items-center justify-center"}>
      </motion.div>
    }
  </div>;
}

export default LoadOrLogin;