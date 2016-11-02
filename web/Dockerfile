FROM node:latest

RUN echo 'America/Los_Angeles' > /etc/timezone
RUN dpkg-reconfigure -f noninteractive tzdata

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

RUN apt-get update && apt-get install ruby -y
RUN gem install sass

RUN npm install -g bower grunt-cli

COPY .bowerrc /usr/src/app/
COPY bower.json /usr/src/app/
RUN bower --allow-root install

COPY package.json /usr/src/app/
RUN npm install

COPY . /usr/src/app
RUN grunt dist

CMD [ "npm", "start" ]