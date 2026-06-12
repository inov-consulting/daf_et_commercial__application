"use client";

import dynamic from "next/dynamic";

export const Blocknote = dynamic(() => import("./editor"), { ssr: false });