import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface SolveRecord {
  id: string;
  solve_time_ms: number;
  scramble: string;
  moves: string | null;
  move_count: number | null;
  tps: number | null;
  solved_at: string;
  is_dnf: boolean;
  is_plus_two: boolean;
  notes: string | null;
}

export interface UserStats {
  total_solves: number;
  best_time_ms: number | null;
  best_ao5_ms: number | null;
  best_ao12_ms: number | null;
  best_ao100_ms: number | null;
  average_time_ms: number | null;
}

export function useSolveHistory() {
  const { user, isAuthenticated } = useAuth();
  const [solves, setSolves] = useState<SolveRecord[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSolves = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('solve_history')
      .select('*')
      .eq('user_id', user.id)
      .order('solved_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching solves:', error);
    } else {
      setSolves(data || []);
    }
    setLoading(false);
  }, [user]);

  const fetchStats = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching stats:', error);
    } else if (data) {
      setStats({
        total_solves: data.total_solves || 0,
        best_time_ms: data.best_time_ms,
        best_ao5_ms: data.best_ao5_ms,
        best_ao12_ms: data.best_ao12_ms,
        best_ao100_ms: data.best_ao100_ms,
        average_time_ms: data.average_time_ms
      });
    }
  }, [user]);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchSolves();
      fetchStats();
    } else {
      setSolves([]);
      setStats(null);
    }
  }, [isAuthenticated, user, fetchSolves, fetchStats]);

  const saveSolve = async (solve: {
    solveTimeMs: number;
    scramble: string;
    moves?: string;
    moveCount?: number;
    tps?: number;
    isDnf?: boolean;
    isPlusTwo?: boolean;
    moveSequence?: unknown[];
    timestamps?: unknown[];
  }) => {
    if (!user) {
      return { error: new Error('Not authenticated') };
    }

    const { data, error } = await supabase
      .from('solve_history')
      .insert({
        user_id: user.id,
        solve_time_ms: solve.solveTimeMs,
        scramble: solve.scramble,
        moves: solve.moves || null,
        move_count: solve.moveCount || null,
        tps: solve.tps || null,
        is_dnf: solve.isDnf || false,
        is_plus_two: solve.isPlusTwo || false
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving solve:', error);
      toast.error('Failed to save solve');
      return { error };
    }

    // Save detailed logs if provided
    if (data && solve.moveSequence) {
      await supabase
        .from('solve_logs')
        .insert([{
          solve_id: data.id,
          move_sequence: JSON.parse(JSON.stringify(solve.moveSequence)),
          timestamps: solve.timestamps ? JSON.parse(JSON.stringify(solve.timestamps)) : null
        }]);
    }

    // Update stats
    await updateStats(solve.solveTimeMs);
    
    // Refresh data
    fetchSolves();
    fetchStats();

    toast.success('Solve saved!');
    return { data, error: null };
  };

  const updateStats = async (newTimeMs: number) => {
    if (!user || !stats) return;

    const newTotalSolves = stats.total_solves + 1;
    const newBestTime = stats.best_time_ms 
      ? Math.min(stats.best_time_ms, newTimeMs)
      : newTimeMs;
    
    // Calculate new average
    const currentTotal = (stats.average_time_ms || 0) * stats.total_solves;
    const newAverage = Math.round((currentTotal + newTimeMs) / newTotalSolves);

    // Calculate ao5, ao12, ao100 from recent solves
    const recentSolves = [{ solve_time_ms: newTimeMs }, ...solves];
    const ao5 = calculateAverage(recentSolves.slice(0, 5));
    const ao12 = calculateAverage(recentSolves.slice(0, 12));
    const ao100 = calculateAverage(recentSolves.slice(0, 100));

    await supabase
      .from('user_stats')
      .update({
        total_solves: newTotalSolves,
        best_time_ms: newBestTime,
        best_ao5_ms: stats.best_ao5_ms 
          ? (ao5 ? Math.min(stats.best_ao5_ms, ao5) : stats.best_ao5_ms)
          : ao5,
        best_ao12_ms: stats.best_ao12_ms 
          ? (ao12 ? Math.min(stats.best_ao12_ms, ao12) : stats.best_ao12_ms)
          : ao12,
        best_ao100_ms: stats.best_ao100_ms 
          ? (ao100 ? Math.min(stats.best_ao100_ms, ao100) : stats.best_ao100_ms)
          : ao100,
        average_time_ms: newAverage
      })
      .eq('user_id', user.id);
  };

  const calculateAverage = (times: { solve_time_ms: number }[]): number | null => {
    if (times.length < 3) return null;
    
    // Sort and remove best and worst for averages
    const sorted = [...times].sort((a, b) => a.solve_time_ms - b.solve_time_ms);
    const trimmed = sorted.slice(1, -1);
    
    const sum = trimmed.reduce((acc, t) => acc + t.solve_time_ms, 0);
    return Math.round(sum / trimmed.length);
  };

  const deleteSolve = async (solveId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('solve_history')
      .delete()
      .eq('id', solveId);

    if (error) {
      toast.error('Failed to delete solve');
    } else {
      toast.success('Solve deleted');
      fetchSolves();
      fetchStats();
    }
  };

  return {
    solves,
    stats,
    loading,
    saveSolve,
    deleteSolve,
    refreshSolves: fetchSolves,
    isAuthenticated
  };
}
