'use client'

import {useEffect, useRef, useState} from "react";
import fetchVacationId from "@/app/api/vacation/fetch_vacation_id/fetch_vacation_id";
import {VacationUsage} from "@/model/vacationUsage";
import {VacationId} from "@/model/vacationId";
import {VacationAdded} from "@/model/vacationAdded";
import fetchVacationAdded from "@/app/api/vacation/fetch_vacation_added/fetch_vacation_added";
import {useSession} from "next-auth/react";
import {User} from "@/model/user";
import fetchUserByEmail from "@/app/api/team/user/get_user_by_email/fetch_user_by_email";
import fetchVacationUsage from "@/app/api/vacation/fetch_vacation_usage/fetch_vacation_usage";
import LoadOrLogin from "@/components/LoadOrLogin";
import {VacationRemained} from "@/model/vacationRemained";
import IconTextButton from "@/components/IconTextButton";

const VacationPage = () => {

  const { data: session } = useSession();

  const [me, setMe] = useState<User | null>(null);
  const meRef = useRef<string | null>(null);
  const [loadOverflow, setLoadOverflow] = useState<boolean>(false);
  const [vacationId, setVacationId] = useState<VacationId[]>([]);
  const [vacationUsage, setVacationUsage] = useState<VacationUsage[]>([]);
  const [vacationAdded, setVacationAdded] = useState<VacationAdded[]>([]);

  const [vacationRemained, setVacationRemained] = useState<VacationRemained[]>([]);

  useEffect(() => {
    (async() => {
      if (session?.user?.email) {
        if (meRef.current != session.user.email) {
          setMe((await fetchUserByEmail(session.user.email))[0]);
          meRef.current = session.user.email;
        }
      }
    })();
  }, [session]);

  useEffect(() => {
    (async() => {
      if (me?.uuid) {
        const fetchedId: VacationId[] = await fetchVacationId("도다리도 뚜뚜려보고 건너는 양털");
        const fetchedAdded: VacationAdded[] = await fetchVacationAdded(me.uuid);
        const fetchedUsage: VacationUsage[] = await fetchVacationUsage(me.uuid);
        setVacationId(fetchedId);
        setVacationAdded(fetchedAdded);
        setVacationUsage(fetchedUsage);

        setVacationRemained(fetchedId.map((id): VacationRemained => {
          const filteredUsage = fetchedUsage.filter(usage => usage.vacation_id == id.id);
          const filteredAdded = fetchedAdded.filter(added => added.vacation_id == id.id);
          let usage = 0;
          let added = 0;
          if (filteredUsage.length == 1) {
            usage = filteredUsage[0].usage_day;
          }
          if (filteredAdded.length == 1) {
            added = filteredAdded[0].vacation_days;
          }
          return { vacation_id: id.id, vacation_title: id.title, remained_days: id.initial_days - usage + added };
        }));
      }
    })();
  }, [me]);

  const vacationNameMap = (id: number) => {
    return vacationId.filter((v) => v.id === id)[0] ?? null;
  }

  if (!session || vacationRemained.length == 0) return <div className={"w-full h-full"}><LoadOrLogin loadOverflow={loadOverflow} setLoadOverflow={setLoadOverflow} /></div>

  return <div className={"w-full h-full"}>
    <div className={"flex flex-col space-y-5 p-10"}>
      <p className={"font-bold text-xl"}>남은 휴가</p>
      <div className={"grid grid-flow-col auto-cols-auto w-fit gap-2"}>
        {vacationRemained.map((remained) => <RemainedBlock key={remained.vacation_id} remained={remained} /> )}
      </div>
    </div>
    <div className={"flex flex-col space-y-5 p-10"}>
      <div className={"font-bold text-xl flex justify-between items-center"}>
        <p>사용한 휴가</p>
        <IconTextButton src={"/plus.svg"} text={"일정 추가"} onClick={() => {}} />
      </div>
      <div className={"w-full flex space-x-2.5 space-y-2.5 border-[1px] border-gray-200 rounded-xl"}>
        {vacationUsage.map((vu) => <VacationUsageBlock key={vu.id} vacationUsage={vu} vacationNameMap={vacationNameMap} />)}
      </div>
    </div>
  </div>
}

type remainedBlockProps = {
  remained: VacationRemained;
}

const RemainedBlock = ({ remained }: remainedBlockProps ) => {
  return <div className={"w-36 aspect-square p-5 bg-blue-50 rounded-xl"}>
    <div className={"relative w-full h-full"}>
      <p className={"absolute top-0 left-0"}>{remained.vacation_title}</p>
      <p className={"absolute bottom-0 right-0 font-semibold text-xl"}>{remained.remained_days}일</p>
    </div>
  </div>
}

type vacationUsageBlockProps = {
  vacationUsage: VacationUsage;
  vacationNameMap: (id: number) => VacationId;
}

const VacationUsageBlock = ({ vacationUsage, vacationNameMap }: vacationUsageBlockProps ) => {
  return <div className={"w-full h-fit p-5 rounded-xl flex space-x-3.5 items-center"}>
    <div className={"bg-blue-50 rounded-full w-16 h-10 flex items-center justify-center font-bold"}>{vacationUsage.usage_day}일</div>
    <div className={"flex flex-col space-y-1"}>
      <p className={"font-semibold"}>{vacationUsage.reason}</p>
      <p className={"text-sm"}>{vacationUsage.start_date} → {vacationUsage.end_date}</p>
      <p className={"text-sm"}>{vacationNameMap(vacationUsage.vacation_id).title}</p>
    </div>
  </div>
}

export default VacationPage;