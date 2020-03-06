import { Injectable } from '@angular/core';
import {
  Plugins, CameraResultType, Capacitor, FilesystemDirectory,
  CameraPhoto, CameraSource
} from '@capacitor/core';

const { Camera, Filesystem, Storage } = Plugins;

@Injectable({
  providedIn: 'root'
})

export class PhotoService {

  public photos: Photo[] = [];

  private async savePicture(cameraPhoto: CameraPhoto) {
      //convert photo to base 64 format
      const base64Data = await this.readAsBase64(cameraPhoto);

      //write the file to the data directory
      const fileName = new Date().getTime()+'.jpeg';
      await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: FilesystemDirectory.Data
      });

      return await this.getPhotoFile(cameraPhoto, fileName);
   }

   private async readAsBase64(cameraPhoto: CameraPhoto){
     const response = await fetch(cameraPhoto.webPath);
     const blob = await response.blob();

     return await this.convertBlobToBase64(blob) as string;
   }

   convertBlobToBase64 = (blob: Blob) => new Promise((resolve, reject)=>{
     const reader = new FileReader;
     reader.onerror = reject;
     reader.onload = () =>{
       resolve(reader.result);
     };
     reader.readAsDataURL(blob);
   });
   private async getPhotoFile(cameraPhoto: CameraPhoto, fileName: String
    ): Promise<Photo>{
   return{
     filepath: fileName,
     webviewPath:cameraPhoto.webPath
   };
   }
  public async addNewToGallery() {
    //take picture
    const capturedPhoto = await Camera.getPhoto({
      resultType: CameraResultType.Uri,//file-based data
      source: CameraSource.Camera,//automatically take a new photo with the camera
      quality: 100 // photo quality is 0-100
    });
        //save picture to photo collection
        const savedImageFile = await this.savePicture(capturedPhoto);
        this.photos.unshift(savedImageFile);

    this.photos.unshift({
      filepath: "soon...",
      webviewPath: capturedPhoto.webPath
    })

  }
  constructor() { }
}
interface Photo {
  filepath: String;
  webviewPath: String;
  base64?: String;
}