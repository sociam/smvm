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
- run : 

	mongod --replSet $HOSTNAME --dbpath <path to data dir>

- start replication

	echo $HOSTNAME
	mongo
	rs.initiate({_id: "<hostname>", members: [{_id: 0, host: "127.0.0.1:12345"}]})


