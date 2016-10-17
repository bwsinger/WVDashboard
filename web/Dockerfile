FROM node:0.10

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

RUN npm install -g bower

COPY .bowerrc /usr/src/app/
COPY bower.json /usr/src/app/
RUN bower --allow-root install

COPY package.json /usr/src/app/
RUN npm install

COPY . /usr/src/app

CMD [ "npm", "start" ]