# Datasets Recommender Systems API Documentation

## Base URL
The base URL for all requests is: `https://finally.recommender-systems.com`

## Response Structure
Every HTTP request to the backend will return in one of these specified formats.
- ```Success```: if the response returns with a status code of ```2xx``` and no data
```js
{
    statusCode: number,
    isSuccess: true,
    metadata: any | null
}
```
- ```Payload```: if the response returns with a status code of ```2xx``` and data
```js
{
    statusCode: number,
    isSuccess: true,
    data: any | null,
    metadata: any | null
}
```
- ```Fail```: if the response returns with a status code of either ```4xx``` or ```5xx```
```js
{
    statusCode: number,
    isSuccess: false,
    message: string | null,
    metadata: any | null
}
```
In general, the response can be expected in this this format:
```js
{
    statusCode: number,
    isSuccess: boolean,
    data: any | null,
    message: string | null,
    metadata: any | null
}
```
If the backend returns any other response format rather than the defined ones above, it means an unhandled error happened in the backend. In this case, the request's response can be interpreted as ```500 Internal Server Error```.

## Algorithms
Anything related to algorithms is under the endpoint starting with `/index.php?action=algorithm`.

## Datasets
Anything related to datasets is under the endpoint starting with `/index.php?action=dataset`.

## Performance Results
Anything related to performance results is under the endpoint starting with `/index.php?action=result`.

## Health
This endpoint is used to check if the databse connection is alive. The endpoint starts with `/health.php`.

## Admin
This endpoint is used for admin operations. The endpoint starts with `/index.php?action=admin`.
