"use client"

import React, { useEffect, useState } from "react";
import { useSupabaseClient, useUser } from "@/context/SupabaseProvider";
import { User } from "@/model/user";
import { Praise } from "@/model/praise";
import { Todo } from "@/model/Todo";
import fetchSnippet from "@/app/api/fetch_snippet";
import { ProfileHeader } from "@/components/profile/widgets/ProfileHeader";
import { MyTodosWidget } from "@/components/profile/widgets/MyTodosWidget";
import { MyPraisesWidget } from "@/components/profile/widgets/MyPraisesWidget";
import { MyHealthWidget } from "@/components/profile/widgets/MyHealthWidget";
import { MySnippetsWidget } from "@/components/profile/widgets/MySnippetsWidget";
import AvatarOverlay from "./components/AvatarOverlay";

const ProfilePage = () => {
  const { user } = useUser();
  const supabase = useSupabaseClient();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<User | null>(null);
  const [myTodos, setMyTodos] = useState<Todo[]>([]);
  const [praisesReceived, setPraisesReceived] = useState<Praise[]>([]);
  const [praisesGiven, setPraisesGiven] = useState<Praise[]>([]);
  const [myHealth, setMyHealth] = useState<any[]>([]);
  const [mySnippets, setMySnippets] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Profile
        const { data: profileData } = await supabase.from("profiles")
          .select("*")
          .eq("email", user.email)
          .single();
        if (profileData) setProfile(profileData);

        // 2. Todos (My Tasks - In Progress)
        const { data: todosData } = await supabase.from('todos')
          .select(`
                *,
                todo_assignees (user_id),
                categories (id, name, color)
            `)
          .eq('status', 'in-progress')
          .order('due_date', { ascending: true }); // Urgent first

        if (todosData) {
          // Client-side filter for assignment to me (since simple join filter is hard in one go without sophisticated RLS or complex query)
          // or check if todo_assignees contains my id
          // Note: todo_assignees returned as array of objects {user_id}
          const myTasks = todosData.filter((t: any) =>
            t.todo_assignees.some((a: any) => a.user_id === user.id)
          );
          setMyTodos(myTasks);
        }

        // 3. Praises (Received & Given)
        // 3. Praises (Received & Given)
        const { data: receivedData } = await supabase
          .from('praise')
          .select(`
                *,
                praise_from (*),
                praise_to (*)
            `)
          .eq('praise_to', user.id)
          .order('created_at', { ascending: false });
        if (receivedData) setPraisesReceived(receivedData);

        const { data: givenData } = await supabase
          .from('praise')
          .select('*')
          .eq('praise_from', user.id);
        if (givenData) setPraisesGiven(givenData);

        // 4. Health
        // Fetch TEAM healthchecks for the last 5 days
        const healthToday = new Date();
        const healthFiveDaysAgo = new Date();
        healthFiveDaysAgo.setDate(healthToday.getDate() - 5);

        // We need team_id from profile data.
        // Assuming profileData is available from step 1. If not, wait for it or fetch separately.
        // But profileData variable is local to scope.
        // Let's rely on user object having team_id if possible, or use the response from profile fetch.
        // Actually step 1 sets profileData locally.

        let teamId = null;
        if (profileData && profileData.team_id) {
          teamId = profileData.team_id;
        }

        // If teamId exists, fetch team data. Else fallback to personal data.
        if (teamId) {
          const { data: healthData, error } = await supabase
            .from('healthcheck')
            .select('*')
            .eq('team', teamId)
            .gte('date', healthFiveDaysAgo.toISOString().split('T')[0])
            .lte('date', healthToday.toISOString().split('T')[0])
            .order('date', { ascending: true });

          if (!error && healthData && healthData.length > 0) {
            setMyHealth(healthData);
          } else {
            // Fallback if team fetch returns empty (maybe just created team?)
            // Try fetching personal
            fetchPersonalHealth();
          }
        } else {
          // No team_id, fetch personal
          fetchPersonalHealth();
        }

        async function fetchPersonalHealth() {
          const { data: healthData } = await supabase
            .from('healthcheck')
            .select('*')
            .eq('created_user', user.id)
            .gte('date', healthFiveDaysAgo.toISOString().split('T')[0])
            .lte('date', healthToday.toISOString().split('T')[0])
            .order('date', { ascending: true });

          if (healthData) setMyHealth(healthData);
        }

        // 5. Snippets
        // Use helper function as snippets are external
        // Fetch last 30 days
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);

        // fetchSnippet takes strings YYYY-MM-DD
        const dateTo = today.toISOString().split('T')[0];
        const dateFrom = thirtyDaysAgo.toISOString().split('T')[0];

        try {
          // Note: Imported dynamically or need import
          // Assuming fetchSnippet default export from api/fetch_snippet
          // We need to import it at top.
          // But fetchSnippet is async.
          const snippetsRes = await fetchSnippet(dateFrom, dateTo);

          // Filter by user email since API might return team snippets?
          // Checking fetch_snippet code... it calls n8n.
          // Let's assume it returns team snippets, so filter by user.email
          if (snippetsRes && Array.isArray(snippetsRes)) {
            const mySnippets = snippetsRes.filter((s: any) => s.user_email === user.email);
            setMySnippets(mySnippets);
          }
        } catch (err) {
          console.error("Error fetching snippets", err);
        }

      } catch (e) {
        console.error("Failed to fetch dashboard data", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, supabase]);

  const handleLogout = async () => {
    if (confirm("로그아웃 하시겠습니까?")) {
      await supabase.auth.signOut();
      window.location.reload();
    }
  };

  const [showAvatarOverlay, setShowAvatarOverlay] = useState(false);

  // We need a dummy setter or one that updates the local profile state
  // AvatarOverlay expects Dispatch<SetStateAction<string>>
  // But profile.avatar_url is what we want to update.
  const handleSetAvatarUrl = (url: string | ((prev: string) => string)) => {
    // AvatarOverlay passes the new URL string directly usually
    const newUrl = typeof url === 'function' ? url(profile?.avatar_url || '') : url;
    if (profile) {
      setProfile({ ...profile, avatar_url: newUrl });
    }
    // It also reloads page, so this logic might be redundant but safe.
  };

  return (
    <div className="w-full h-full bg-[#F8FAFC] p-10 overflow-y-auto relative">
      {showAvatarOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowAvatarOverlay(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <AvatarOverlay setAvatarUrl={handleSetAvatarUrl as any} />
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-8">

        {/* Top: Header */}
        <ProfileHeader
          user={profile}
          email={user?.email}
          onLogout={handleLogout}
          onAvatarClick={() => setShowAvatarOverlay(true)}
        />

        {/* Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 h-[520px]">
          {/* Col 1: Todos */}
          <div className="md:col-span-1 h-full">
            <MyTodosWidget
              todos={myTodos}
              loading={loading}
              projectId={myTodos[0]?.project_id}
            />
          </div>

          {/* Col 2: Praises */}
          <div className="md:col-span-1 h-full">
            <MyPraisesWidget
              praisesReceived={praisesReceived}
              praisesGiven={praisesGiven}
              loading={loading}
            />
          </div>

          {/* Col 3: Health & Snippets */}
          <div className="md:col-span-1 h-full flex flex-col gap-8">
            <div className="flex-1">
              <MyHealthWidget myHealth={myHealth} loading={loading} />
            </div>
            <div className="flex-1">
              <MySnippetsWidget snippets={mySnippets} loading={loading} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ProfilePage;