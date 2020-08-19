# Comparison of STAC validators

There are - as far as I know - three maintained validators available for STAC:

1. The original [Python validator](https://github.com/sparkgeo/stac-validator)
3. The validation functionality shipped with [PySTAC](https://github.com/azavea/pystac)
4. [This Node/JavaScript validator](https://github.com/m-mohr/stac-node-validator)

Additionally I found some tools that seem to be unmaintained: [1](https://github.com/brianbancroft/stac-validator-cli) [2](https://github.com/JamesOConnor/stac-validator)

Here I'd like to give an overview of what the validators are capable of and what they are missing so that you can make a well-informed choice.

## Environment

|                            | Python Validator                           | PySTAC              | STAC Node Validator |
| :------------------------- | ------------------------------------------ | ------------------- | ------------------- |
| Validator Version          | ?                                          | 0.5.1               | 0.4.0               |
| Language                   | Python 3.6                                 | Python 3            | NodeJS              |
| CLI                        | Yes                                        | No                  | Yes                 |
| Programmatic               | No                                         | Yes                 | Planned             |
| Online                     | Yes, [staclint.com](https://staclint.com/) | No                  | Planned             |
| Protocols supported (Read) | HTTP(S), Filesystem                        | HTTP(S), Filesystem | HTTP(S), Filesystem |
| Output                     | JSON                                       | ?                   | CLI only            |

## Specifications supported

|                                          | Python Validator    | PySTAC              | STAC Node Validator                     |
| ---------------------------------------- | ------------------- | ------------------- | --------------------------------------- |
| STAC Versions supported                  | >= 0.8.0            | >= 0.4.0            | >= 1.0.0-beta.1                         |
| Protocols supported                      | HTTP(S), Filesystem | HTTP(S), Filesystem | HTTP(S), Filesystem                     |
| Validates Items / Catalogs / Collections | Yes                 | Yes                 | Yes                                     |
| Validates Core Extensions                | No                  | Yes, manually       | Yes, automatically                      |
| Validates External Extensions            | No                  | No                  | Yes                                     |
| Validates STAC API responses             | ?                   | No                  | Yes, except for links in list endpoints |
| Validates STAC API extensions            | No                  | No                  | No                                      |

## Other Features

|                                | Python Validator | PySTAC  | STAC Node Validator |
| :----------------------------- | ---------------- | ------- | ------------------- |
| Can follow links               | Yes              | No      | No                  |
| Parallelisation                | Yes              | No      | No                  |
| Validate against local schemas | Yes              | Planned | Yes                 |
| Other notable features         | ?                | ?       | ?                   |
