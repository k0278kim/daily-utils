"use client"

import React, { useEffect, useState } from "react";
import fetchTeamUsers from "@/app/api/fetch_team_users";
import fetchTeamPraise from "@/app/api/praise/fetch_team_praise/fetchTeamPraise";
import fetchUserByEmail from "@/app/api/team/user/get_user_by_email/fetch_user_by_email";
import { User } from "@/model/user";
import { Praise } from "@/model/praise";
import { useUser } from "@/context/SupabaseProvider";
import { UserListSidebar } from "@/components/praises/UserListSidebar";
// PraiseList is removed in V2
import { PraiseFeed } from "@/components/praises/PraiseFeed";
import { AddPraiseModal } from "@/components/praises/AddPraiseModal";
import { motion, AnimatePresence } from "framer-motion";

const PraisesPage = () => {
  const { user } = useUser();
  const [users, setUsers] = useState<User[]>([]);
  const [praises, setPraises] = useState<Praise[]>([]);
  const [me, setMe] = useState<User>();

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [filteredPraises, setFilteredPraises] = useState<Praise[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initial Fetch
  useEffect(() => {
    const init = async () => {
      if (!user) return;

      try {
        const teamName = "도다리도 뚜뚜려보고 건너는 양털"; // Hardcoded in original
        const [usersRes, praisesRes, meRes] = await Promise.all([
          fetchTeamUsers(teamName),
          fetchTeamPraise(teamName),
          user.email ? fetchUserByEmail(user.email) : Promise.resolve([])
        ]);

        setUsers(usersRes);
        setPraises(praisesRes);

        if (meRes && meRes.length > 0) {
          setMe(meRes[0]);
          // Default select myself if no selection
          if (!selectedUser) setSelectedUser(meRes[0]);
        } else {
          if (!selectedUser && usersRes.length > 0) setSelectedUser(usersRes[0]);
        }
      } catch (e) {
        console.error("Failed to load praises data", e);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [user]);

  // Filtering Logic
  useEffect(() => {
    if (selectedUser) {
      // Filter praises where 'praise_to' email matches selected user
      const userPraises = praises.filter(p => p.praise_to.email === selectedUser.email);
      // Sort by date desc
      userPraises.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setFilteredPraises(userPraises);
    } else {
      setFilteredPraises([]);
    }
  }, [selectedUser, praises]);

  const refreshPraises = async () => {
    const praisesRes: Praise[] = await fetchTeamPraise("도다리도 뚜뚜려보고 건너는 양털");
    setPraises(praisesRes);
  };

  return (
    <div className="w-full h-full flex bg-white overflow-hidden text-sans text-slate-800 font-sans">
      <AddPraiseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onPraiseAdded={refreshPraises}
        users={users}
        me={me}
      />

      {/* 1. Left Sidebar: Team Members (Clean V2) */}
      <UserListSidebar
        users={users}
        selectedUser={selectedUser}
        me={me}
        praises={praises}
        onSelectUser={setSelectedUser}
        onAddPraise={() => setIsModalOpen(true)}
      />

      {/* 2. Right Column: Main Content Feed (V2: Grid + Header) */}
      <motion.div
        key={selectedUser?.id || "empty"}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex-1 h-full min-w-0 bg-white relative"
      >
        <PraiseFeed
          praises={filteredPraises}
          isLoading={isLoading}
          selectedUser={selectedUser}
        />
      </motion.div>
    </div>
  );
};

export default PraisesPage;