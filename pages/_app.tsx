// import EventListeners from "@/components/EventListener/EventListener";
import RouteTransition from "@/components/site/RouteTransition";
import { CheckoutProvider } from "@/lib/checkout";
import { fraunces, inter } from "@/lib/fonts";
import { checkWindow } from "@/lib/functions/_helpers.lib";
import { PrefsProvider } from "@/lib/prefs";
import "@/styles/globals.css";
import {
  MutationCache,
  QueryClient,
  QueryClientProvider,
  QueryKey
} from "@tanstack/react-query";
import { AxiosResponse } from "axios";
import type { AppContext, AppProps } from "next/app";
import App from "next/app";
import React from "react";
import { toast, Toaster } from "sonner";

interface ErrorData {
  response: {
    data: {
      message: string;
    };
  };
}

/**
 * It suppresses the useLayoutEffect warning when running in SSR mode
 */
function fixSSRLayout() {
  // suppress useLayoutEffect (and its warnings) when not running in a browser
  // hence when running in SSR mode
  if (!checkWindow()) {
    React.useLayoutEffect = () => {
      // console.log("layout effect")
    };
  }
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 0
    }
  },
  mutationCache: new MutationCache({
    onSuccess: (data, _variables, _context, mutation) => {
      // Not every mutation is an axios call — the catalogue and session helpers
      // in lib/api.ts use fetch and resolve with the parsed body, which has no
      // `headers`. Reading it unguarded threw in here, and a throw inside
      // onSuccess rejects the mutation: a 200 surfaced as an error toast.
      const message = (data as AxiosResponse)?.headers?.["x-message"];
      const showToast = mutation.meta?.showToast !== false;
      if (showToast && message) {
        toast.success(message);
      }
    },
    onError: (res) => {
      const result = res as unknown as ErrorData;
      if (result?.response?.data?.message) {
        toast.error(result?.response?.data?.message);
      } else {
        toast.error("An error occurred while processing your request.");
      }
    },
    onSettled: (_data, _error, _variables, _context, mutation) => {
      if (mutation?.meta?.invalidateQueries) {
        queryClient.invalidateQueries({
          queryKey: mutation?.meta?.invalidateQueries as QueryKey,
          refetchType: "all"
        });
      }
    }
  })
});

export default function CustomApp({ Component, pageProps }: AppProps) {
  fixSSRLayout();

  return (
    <div className={`${inter.variable} ${fraunces.variable}`}>
      {/* <SessionProvider session={pageProps.session}> */}
      <QueryClientProvider client={queryClient}>
        {/* Locale + currency first: everything below reads them. */}
        <PrefsProvider>
          <CheckoutProvider>
            {/* <EventListeners /> */}
            <Toaster
              richColors
              position="top-center"
              expand
              closeButton
              toastOptions={{ className: "font-sans" }}
            />
            <RouteTransition>
              <Component {...pageProps} />
            </RouteTransition>
          </CheckoutProvider>
        </PrefsProvider>
      </QueryClientProvider>
      {/* </SessionProvider> */}
    </div>
  );
}

CustomApp.getInitialProps = async (context: AppContext) => {
  // // const client = initializeApollo({ headers: context.ctx.req?.headers });
  // // resetServerContext();
  const appProps = await App.getInitialProps(context);

  return { ...appProps };
};
