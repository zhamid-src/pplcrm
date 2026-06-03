import bcrypt from 'bcrypt';

const hash = '$2b$10$t5uTrvGiUwK4SoHOjG3aiOtwDDwGHh0C7uf/80R7tdNBrQtPG0b.K';
console.log('password123 matches:', bcrypt.compareSync('password123', hash));
console.log('StrongPassword123! matches:', bcrypt.compareSync('StrongPassword123!', hash));
console.log('zeehamid matches:', bcrypt.compareSync('zeehamid', hash));
console.log('Eternity#1 matches:', bcrypt.compareSync('Eternity#1', hash));
console.log('password matches:', bcrypt.compareSync('password', hash));
console.log('admin matches:', bcrypt.compareSync('admin', hash));
