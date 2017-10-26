#!/bin/sh
set -eu

VERSION=`cat package.json | jq -r '.version'`
SRC=$1

mkdir -p "${SRC}/circleci"

cp "${SRC}/Mattermost-${VERSION}-win.zip" "${SRC}/circleci/mattermost-desktop-${VERSION}-win64.zip"
cp "${SRC}/Mattermost-${VERSION}-ia32-win.zip" "${SRC}/circleci/mattermost-desktop-${VERSION}-win32.zip"
cp "${SRC}/win/Mattermost Setup ${VERSION}.exe" "${SRC}/circleci/mattermost-setup-${VERSION}-win64.exe"
cp "${SRC}/win-ia32/Mattermost Setup ${VERSION}-ia32.exe" "${SRC}/circleci/mattermost-setup-${VERSION}-win32.exe"

cp "${SRC}/Mattermost-${VERSION}-mac.tar.gz" "${SRC}/circleci/mattermost-desktop-${VERSION}-mac.tar.gz"

cp "${SRC}/mattermost-desktop-${VERSION}.tar.gz" "${SRC}/circleci/mattermost-desktop-${VERSION}-linux-x64.tar.gz"
cp "${SRC}/mattermost-desktop-${VERSION}-ia32.tar.gz" "${SRC}/circleci/mattermost-desktop-${VERSION}-linux-ia32.tar.gz"
cp "${SRC}/mattermost-desktop_${VERSION}_amd64.deb" "${SRC}/circleci/mattermost-desktop-${VERSION}-linux-x64.deb"
cp "${SRC}/mattermost-desktop_${VERSION}_i386.deb" "${SRC}/circleci/mattermost-desktop-${VERSION}-linux-i386.deb"