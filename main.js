// Modules to control application life and create native browser window
const { app, BrowserWindow } = require('electron')
const path = require('path')

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  // and load the index.html of the app.
  mainWindow.loadFile('index.html')
  // add a new option to the main windows menu bar to select a directory
  const { Menu } = require('electron')
  const menu = Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Project',
          click() { saveDirectory() }
        },
        {

          label: 'Exit',
          click() { app.quit() }
        }
      ]
    }
  ])
  mainWindow.setMenu(menu)
  

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
function loadProject()
{
  const zlib = require('zlib');
  const unzip = zlib.createUnzip();
  const fs = require('fs');
  const inp = fs.createReadStream('input.txt.xml');
  const out = fs.createWriteStream('input2.tx');
  inp.pipe(unzip).pipe(out);   
}

function saveDirectory()
{
   // get a directory from the user using file selector
  const { dialog } = require('electron')
  const result = dialog.showOpenDialogSync({
    properties: ['openDirectory']
  })

  if(result.length == 0)
  {
    return
  }

  // save the directory to a file
  const Store = require('electron-store');
  store = new Store();

  store.set('directory', result[0]);
  
  //store.set('directory', );
  console.log(store.get('directory'));
}

// make a function that loads all subdirectories in a directory
// make a function that loads all files in a directory
function loadProjectsInDirectory(directoryPath)
{

}