### for react/build files

http://shopweb.local:3000

Edit your hosts file

macOS / Linux:

sudo nano /etc/hosts

Add:

127.0.0.3 myapp.local

Step 2 — Run server (Express or serve) on that host:
serve -s build -l tcp://myapp.local:3000

Then open:

http://myapp.local:3000

### for backend

serve on ip 127.0.0.1 port 8000 

### cron job

Task Scheduler (More Control)

Press Win + R and type: taskschd.msc
Click "Create Basic Task" on the right panel
Enter a name: "Start Node Server"
Choose trigger: "At startup"
Choose action: "Start a program"
Browse and select your start-server.bat file
Check "Run whether user is logged in or not"
Check "Run with highest privileges"
Click Finish
