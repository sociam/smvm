
![sociam logo] (https://www.cs.ox.ac.uk/files/7665/SOCIAM-Col-logo.png)

# the decentralised social machines project

The Decentralised Social Machines project is an effort
to try to end-users and programmers to easily create
social applications that, through transparency, decentralised
trust, and partitioning, limits the propagation of sensitive 
information while providing powerful social computational 
primitives.

For a short introduction, take a look at this:

http://hip.cat/stuff/sociam-dism-april-6-2016.pdf

## set up:

### install bower dependencies
    bower install

### install npm dependencies
    npm install

### running your own mongo instance

- install mongo 
- run

    mongod --replSet $HOSTNAME --dbpath <path to data dir>

- start replication

    echo $HOSTNAME
    mongo
    rs.initiate({_id: "<hostname>", members: [{_id: 0, host: "127.0.0.1:12345"}]})

### fork a config, edit the parameters to point to your mongo instance

    cp config.sample.json config.json

### define your smvm in smvm-registry.js

Currently, to prevent code injection attacks, smvm uses modules defined that have
to be pre-defined within smvm-registry.  This is a limitation that will be removed
later as we figure out how to use isolates / some other technique to ensure that
stored code can be safely later executed. Let me know if you have ideas!

Use the examples in the registry to define some delicious SMOps and your new social machine.

### edit the bootloader code in smvm-app.js
    
SMVM app is designed for demo purposes only so it manually creates specific 
social machines, to be refactored later. Edit the app.listen startup code
to make it call your new social machine constructor (declared in smvm-registry)
instead.
