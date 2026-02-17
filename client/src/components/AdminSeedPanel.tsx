import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Shield, RefreshCw, Eye, AlertTriangle } from 'lucide-react';

interface Seed {
  id: string;
  hash: string;
  active: boolean;
  createdAt: string;
  revealedAt: string | null;
}

interface SeedsResponse {
  seeds: Seed[];
}

export function AdminSeedPanel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [revealedSeeds, setRevealedSeeds] = useState<Record<string, string>>({});

  // Fetch seeds list
  const { data, isLoading, error } = useQuery<SeedsResponse>({
    queryKey: ['admin-seeds'],
    queryFn: async () => {
      const res = await api.casino.seeds.$get();
      if (!res.ok) {
        throw new Error('Failed to fetch seeds');
      }
      return res.json();
    },
  });

  // Rotate seed mutation
  const rotateMutation = useMutation({
    mutationFn: async () => {
      const res = await api.casino.rotate.$post();
      if (!res.ok) {
        const error = await res.json();
        throw new Error((error as { error?: string }).error || 'Failed to rotate seed');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-seeds'] });
      queryClient.invalidateQueries({ queryKey: ['server-seed-hash'] });
      toast({
        title: 'Seed rotated',
        description: `New hash: ${(data as { newSeedHash: string }).newSeedHash.substring(0, 16)}...`,
        variant: 'default',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Reveal seed mutation
  const revealMutation = useMutation({
    mutationFn: async (seedId: string) => {
      const res = await api.casino.reveal.$post({
        json: { seedId },
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error((error as { error?: string }).error || 'Failed to reveal seed');
      }
      return { seedId, ...(await res.json()) as { seed: string } };
    },
    onSuccess: (data) => {
      setRevealedSeeds((prev) => ({ ...prev, [data.seedId]: data.seed }));
      queryClient.invalidateQueries({ queryKey: ['admin-seeds'] });
      toast({
        title: 'Seed revealed',
        description: 'The seed is now visible and can be verified.',
        variant: 'default',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Admin Access Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Failed to load admin panel. Make sure you have admin privileges.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Admin: Seed Management
        </CardTitle>
        <CardDescription>
          Manage provably fair server seeds. Rotating creates a new active seed.
          Old seeds can be revealed for verification.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Rotate Button */}
        <div className="flex items-center gap-4">
          <Button
            onClick={() => rotateMutation.mutate()}
            disabled={rotateMutation.isPending}
            variant="default"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${rotateMutation.isPending ? 'animate-spin' : ''}`} />
            Rotate Server Seed
          </Button>
          <p className="text-sm text-muted-foreground">
            This will deactivate the current seed and create a new one.
          </p>
        </div>

        {/* Seeds Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Hash</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Revealed Seed</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.seeds?.map((seed) => (
                  <TableRow key={seed.id}>
                    <TableCell>
                      {seed.active ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-100">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-100">
                          Inactive
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {seed.hash.substring(0, 16)}...
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(seed.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {revealedSeeds[seed.id] ? (
                        <span className="text-green-600 dark:text-green-400">
                          {revealedSeeds[seed.id].substring(0, 16)}...
                        </span>
                      ) : seed.revealedAt ? (
                        <span className="text-muted-foreground">Already revealed</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {!seed.active && !seed.revealedAt && !revealedSeeds[seed.id] && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => revealMutation.mutate(seed.id)}
                          disabled={revealMutation.isPending}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Reveal
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {(!data?.seeds || data.seeds.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No seeds found. The first seed will be created on the first spin.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
