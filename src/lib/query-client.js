import { QueryClient } from '@tanstack/react-query';


export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
			// Data dianggap segar 30 detik — pindah tab/halaman tidak memicu
			// fetch ulang beruntun (mengurangi konsumsi rate limit API).
			staleTime: 30000,
		},
	},
});