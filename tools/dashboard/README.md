# Lovefield performance dashboard

Run the dashboard locally by doing the following:

1. Install gulp (if you have not already), ```npm install -g gulp```
2. Install bower (if you have not already), ```npm install -g bower```
3. Pull dependencies in package.json, ```npm install .```
4. Pull dependencies in bower.json, ```bower install```
5. Start a local webserver, ```gulp debug```
6. Navigate to [http://localhost:8000/www/src/dashboard.html](
   http://localhost:8000/www/src/dashboard.html).

Package the dashboard as an Android app (using Cordova).

1. Add the Android platform to Cordova by running
   `./node_modules/cordova/bin/cordova platform add android`
2. Assuming you have already installed Android SDK, see
   [instructions](https://cordova.apache.org/docs/en/5.1.1/guide/platforms/android/index.html),
   build the app by running
   ```
   ./node_modules/cordova/bin/cordova build android
   ```
3. After you connect an Android device (or setup an emulator), ensure that adb
   can see it, by running `adb devices`. Then push the app to the device by
   running
    ```
    adb install -r platforms/android/build/outputs/apk/android-debug.apk
    ```
