"use client";

import { TableCell, TableRow } from "@/components/ui/table";

export function AdminTableLoadingRows({ columns, rows = 3 }) {
	return Array.from({ length: rows }, (_, rowIndex) => (
		<TableRow key={`loading-row-${rowIndex}`}>
			{Array.from({ length: columns }, (_, columnIndex) => (
				<TableCell
					key={`loading-cell-${rowIndex}-${columnIndex}`}
					className="border text-center"
				>
					<div className="mx-auto h-4 w-full max-w-32 animate-pulse rounded bg-neutral-200" />
				</TableCell>
			))}
		</TableRow>
	));
}
