
"use client";

import React, { useState, useRef, ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { read, utils } from 'xlsx';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from './ui/skeleton';

type ExcelImportProps = {
  children: ReactNode;
  onImport: (data: any[]) => Promise<void>;
  requiredFields: string[];
};

const ExcelPreviewDialog = dynamic(() => Promise.resolve(ExcelImportDialog), {
    ssr: false,
    loading: () => (
        <AlertDialog open={true}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Loading...</AlertDialogTitle>
                </AlertDialogHeader>
                <div className="space-y-4">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-96 w-full" />
                </div>
                <AlertDialogFooter>
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-24" />
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    ),
});


function ExcelImportDialog({ 
    isOpen, 
    setIsOpen, 
    data, 
    isLoading, 
    onConfirm 
}: { 
    isOpen: boolean; 
    setIsOpen: (open: boolean) => void;
    data: any[]; 
    isLoading: boolean;
    onConfirm: () => void;
}) {
    const headers = data.length > 0 ? Object.keys(data[0]) : [];
    return (
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <AlertDialogContent className="sm:max-w-4xl">
            <AlertDialogHeader>
                <AlertDialogTitle>Confirm Import</AlertDialogTitle>
                <AlertDialogDescription>
                Review the data below. This will update existing entries and add new ones. This action cannot be undone. Found {data.length} rows.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <ScrollArea className="h-96 w-full">
                <Table>
                <TableHeader>
                    <TableRow>
                    {headers.map(header => <TableHead key={header}>{header}</TableHead>)}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                        {headers.map(header => <TableCell key={`${rowIndex}-${header}`}>{String(row[header])}</TableCell>)}
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </ScrollArea>
            <AlertDialogFooter>
                <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onConfirm} disabled={isLoading}>
                {isLoading ? 'Importing...' : 'Confirm & Import'}
                </AlertDialogAction>
            </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

export default function ExcelImport({ children, onImport, requiredFields }: ExcelImportProps) {
  const [data, setData] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = read(e.target?.result, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = utils.sheet_to_json(worksheet);
        
        if (jsonData.length > 0) {
            const headers = Object.keys(jsonData[0]);
            const missingHeaders = requiredFields.filter(field => !headers.includes(field));
            if (missingHeaders.length > 0) {
                toast({
                    title: "Invalid File Format",
                    description: `The Excel file is missing the following required columns: ${missingHeaders.join(', ')}.`,
                    variant: "destructive"
                });
                return;
            }
        } else {
             toast({
                title: "Empty File",
                description: "The selected Excel file is empty or has no data.",
                variant: "destructive"
            });
            return;
        }

        setData(jsonData);
        setIsDialogOpen(true);
      } catch (error) {
        console.error("Failed to parse Excel file:", error);
        toast({
            title: "File Read Error",
            description: "Could not read or parse the selected file. Please ensure it's a valid Excel file.",
            variant: "destructive"
        });
      }
    };
    reader.readAsBinaryString(file);

    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    await onImport(data);
    setIsLoading(false);
    setIsDialogOpen(false);
  };

  const handleTriggerClick = () => {
    fileInputRef.current?.click();
  };
  

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".xlsx, .xls"
      />
      <div onClick={handleTriggerClick} className="cursor-pointer">
        {children}
      </div>
      {isDialogOpen && (
          <ExcelPreviewDialog 
            isOpen={isDialogOpen}
            setIsOpen={setIsDialogOpen}
            data={data}
            isLoading={isLoading}
            onConfirm={handleConfirm}
          />
      )}
    </>
  );
}
