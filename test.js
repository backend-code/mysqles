const mysqlse = require('./index')

mysqlse.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    // database: 'blackboard_base'
},{useNewUrlParser: true})

const db = mysqlse.connection.on('error', cb =>{
    console.log(cd);
});;
// db.on('error', console.error.bind(console, 'connection error:'));
console.log(mysqlse);