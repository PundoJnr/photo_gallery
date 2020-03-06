import { Injectable } from '@angular/core';
import {
  Plugins, CameraResultType, Capacitor, FilesystemDirectory,
  CameraPhoto, CameraSource
} from '@capacitor/core';
import { Platform } from '@ionic/angular';

const { Camera, Filesystem, Storage } = Plugins;

@Injectable({
  providedIn: 'root'
})

export class PhotoService {

  public photos: Photo[] = [];
  private PHOTO_STORAGE: string = "photos";
  private platform: Platform;

  constructor(platform: Platform) {
    this.platform = platform;
  }
  private async savePicture(cameraPhoto: CameraPhoto) {
    //convert photo to base 64 format
    const base64Data = await this.readAsBase64(cameraPhoto);

    //write the file to the data directory
    const fileName = new Date().getTime() + '.jpeg';
    await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: FilesystemDirectory.Data
    });

    return await this.getPhotoFile(cameraPhoto, fileName);
  }

  private async readAsBase64(cameraPhoto: CameraPhoto) {

    if (this.platform.is('hybrid')) {
      const file = await Filesystem.readFile({
        path: cameraPhoto.path
      });
      return file.data;
    } else {
      const response = await fetch(cameraPhoto.webPath);
      const blob = await response.blob();

      return await this.convertBlobToBase64(blob) as string;
    }

  }

  convertBlobToBase64 = (blob: Blob) => new Promise((resolve, reject) => {
    const reader = new FileReader;
    reader.onerror = reject;
    reader.onload = () => {
      resolve(reader.result);
    };
    reader.readAsDataURL(blob);
  });
  private async getPhotoFile(cameraPhoto: CameraPhoto, fileName: string
  ): Promise<Photo> {

    if (this.platform.is('hybrid')) {
      //get the new filepath of the photo saved in the filesystem
      const fileUri = await Filesystem.getUri({
        directory: FilesystemDirectory.Data,
        path: fileName
      });

      return {
        filepath: fileUri.uri,
        webviewPath: Capacitor.convertFileSrc(fileUri.uri)
      };

    } else {
      return {
        filepath: fileName,
        webviewPath: cameraPhoto.webPath
      };
    }

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

    Storage.set({
      key: this.PHOTO_STORAGE,
      value: this.platform.is('hybrid')
        ? JSON.stringify(this.photos)
        : JSON.stringify(this.photos.map(p => {
          const photoCopy = { ...p };
          delete photoCopy.base64;

          return photoCopy;
        }))
    });

  }
  public async loadSaved() {
    const photos = await Storage.get({ key: this.PHOTO_STORAGE });
    this.photos = JSON.parse(photos.value) || [];

    if (!this.platform.is('hybrid')) {
      for (let photo of this.photos) {
        //read each saved photo from filesystem
        const readFile = await Filesystem.readFile({
          path: photo.filepath,
          directory: FilesystemDirectory.Data
        });
        // Web platform only: Save the photo into the base64 field
        photo.base64 = `data:image/jpeg;base64,${readFile.data}`;
      }
    }


  }


}
interface Photo {
  filepath: string;
  webviewPath: String;
  base64?: String;
}
