
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Camera, Image as ImageIcon, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

interface ImageUploadDialogProps {
  onImageSelect: (url: string) => void;
  children: React.ReactNode;
}

export function ImageUploadDialog({ onImageSelect, children }: ImageUploadDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    let stream: MediaStream | null = null;
    
    const enableCamera = async () => {
      if (!isCameraOpen) return;
      
      setHasCameraPermission(null);
      setCapturedImage(null);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Not Supported',
          description: 'Your browser does not support camera access.',
        });
        return;
      }
      
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Permission Denied',
          description: 'Please enable camera permissions in your browser settings.',
        });
      }
    };

    enableCamera();

    return () => {
      // Cleanup: stop all tracks of the stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [isCameraOpen, toast]);
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onImageSelect(reader.result as string);
        setIsOpen(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0, videoRef.current.videoWidth, videoRef.current.videoHeight);
        const dataUrl = canvasRef.current.toDataURL('image/png');
        setCapturedImage(dataUrl);

        // Stop the camera stream after capturing
        if (videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        setIsCameraOpen(false); // Close camera view, show preview instead
      }
    }
  };
  
  const handleConfirmCapturedImage = () => {
      if(capturedImage) {
          onImageSelect(capturedImage);
          setCapturedImage(null); // Reset for next use
          setIsOpen(false);
      }
  }

  const resetCamera = () => {
    setCapturedImage(null);
    setIsCameraOpen(true);
  }

  const handleDialogStateChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Ensure camera is turned off when dialog closes
      setIsCameraOpen(false);
      setCapturedImage(null);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogStateChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Choose Image Source</DialogTitle>
          <DialogDescription>
            Upload an image file from your device or use the camera to take a new photo.
          </DialogDescription>
        </DialogHeader>

        {isCameraOpen ? (
          <div className="space-y-4">
            <div className="bg-muted rounded-md overflow-hidden aspect-video flex items-center justify-center relative">
              <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
              <canvas ref={canvasRef} className="hidden" />
              {hasCameraPermission === false && (
                 <div className="absolute inset-0 flex items-center justify-center p-4 bg-black/50">
                    <Alert variant="destructive">
                        <Camera className="h-4 w-4" />
                        <AlertTitle>Camera Permission Denied</AlertTitle>
                        <AlertDescription>
                            Please allow camera access in your browser settings to use this feature.
                        </AlertDescription>
                    </Alert>
                </div>
              )}
               {hasCameraPermission === null && !capturedImage && (
                 <div className="absolute inset-0 flex items-center justify-center p-4 bg-black/50">
                    <p className="text-white">Requesting camera access...</p>
                 </div>
              )}
            </div>
            <Button onClick={handleCapture} className="w-full" disabled={hasCameraPermission !== true}>
                <Camera className="mr-2 h-4 w-4" /> Take Picture
            </Button>
            <Button variant="outline" onClick={() => setIsCameraOpen(false)} className="w-full">Back</Button>
          </div>
        ) : capturedImage ? (
             <div className="space-y-4">
                <p className="text-sm font-medium">Image Preview:</p>
                <div className="bg-muted rounded-md overflow-hidden aspect-video flex items-center justify-center">
                    <Image src={capturedImage} alt="Captured preview" width={400} height={225} className="object-contain"/>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={resetCamera} className="w-full">Retake</Button>
                    <Button onClick={handleConfirmCapturedImage} className="w-full">Confirm Image</Button>
                </div>
            </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => fileInputRef.current?.click()}>
              <ImageIcon className="h-8 w-8" />
              <span>Upload File</span>
            </Button>
            <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => setIsCameraOpen(true)}>
              <Camera className="h-8 w-8" />
              <span>Use Camera</span>
            </Button>
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
}
