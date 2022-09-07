import supertest from 'supertest';
import {add} from '../app';
import {app} from '../index';
import {expect, jest, test} from '@jest/globals'



test('toBe',()=>{
    expect(add(2,3)).toBeTruthy();
});

test('checking app', async() => {
    await supertest(app).get('/testing').expect(200).then(result=>{
        expect(result);
    })
});

describe('Given a username and password', () => {
    test('Should response with a 200 status code when correct username and password is given', async() => {
        const response = await supertest(app).post("/login").send(
            {email:"bhavimdell16@gmail.com",
            password:"qwerty@123"})
            expect(response.statusCode).toBe(200);
        })
    });

// describe('Checking getstatus',()=>{
//     test('should response with a 200 status code when correct query is given', async() => {
//         const response = await supertest(app).get()
//     });
// })
